'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AuthenticationError, ValidationError } from '@aimee.shop/sdk';
import type { ZodError } from 'zod';
import { sdk } from '@/lib/sdk';
import {
  CUSTOMER_TOKEN_COOKIE,
  clearSessionCookies,
  setSessionCookies,
} from '@/lib/customer-auth';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
  type SignInValues,
  type SignUpValues,
} from '@/lib/validations/auth';
import type { AuthResult } from '@/lib/auth-form';
import { safeAccountReturnPath } from '@/lib/account-return-path';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

function zodFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !(field in fieldErrors)) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}

export async function loginAction(
  input: SignInValues,
  nextPath?: string | null,
): Promise<AuthResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    const { accessToken, refreshToken } = await sdk.storefront.auth.login(parsed.data);
    setSessionCookies(await cookies(), accessToken, refreshToken);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { ok: false, formError: 'Invalid email or password.' };
    }
    return { ok: false, formError: GENERIC_ERROR };
  }

  return finishAuth(nextPath);
}

export async function registerAction(
  input: SignUpValues,
  nextPath?: string | null,
): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  const { email, password, firstName, lastName } = parsed.data;
  try {
    const { accessToken, refreshToken } = await sdk.storefront.auth.register({
      email,
      password,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    });
    setSessionCookies(await cookies(), accessToken, refreshToken);
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        ok: false,
        formError:
          'Could not create your account. An account with this email may already exist, or the password does not meet requirements.',
      };
    }
    return { ok: false, formError: GENERIC_ERROR };
  }

  return finishAuth(nextPath);
}

function finishAuth(nextPath?: string | null): AuthResult {
  revalidatePath('/account');
  revalidatePath('/checkout');
  const next = safeAccountReturnPath(nextPath);
  if (next) {
    revalidatePath(next);
    redirect(next);
  }
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const accessToken = store.get(CUSTOMER_TOKEN_COOKIE)?.value;

  if (accessToken) {
    try {
      await sdk.storefront.withCustomer(accessToken).auth.logout();
    } catch (error) {
      // Best-effort server-side revocation; local sign-out proceeds regardless.
      // An already-invalid session is expected; anything else is worth a log line.
      if (!(error instanceof AuthenticationError)) {
        console.error('Customer logout revocation failed', error);
      }
    }
  }

  clearSessionCookies(store);
  revalidatePath('/account');
  revalidatePath('/checkout');
}

export async function forgotPasswordAction(
  input: ForgotPasswordValues
): Promise<AuthResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    await sdk.storefront.auth.forgotPassword(parsed.data.email);
  } catch {
    // Deliberately swallowed: the response must not reveal whether an
    // account exists for this email.
  }

  return { ok: true };
}

export async function resetPasswordAction(
  input: ResetPasswordValues
): Promise<AuthResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  try {
    await sdk.storefront.auth.resetPassword(parsed.data);
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return {
        ok: false,
        formError:
          'Invalid or expired code, or the password does not meet requirements. Request a new code and try again.',
      };
    }
    return { ok: false, formError: GENERIC_ERROR };
  }

  redirect('/account?reset=1');
}
