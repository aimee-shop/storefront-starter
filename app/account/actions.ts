'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AimeeError, AuthenticationError, ValidationError } from '@aimee.shop/sdk';
import type { ZodError } from 'zod';
import { sdk } from '@/lib/sdk';
import {
  CUSTOMER_REFRESH_COOKIE,
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

/**
 * 4xx is the account-enumeration control. 429 does not reveal whether an
 * account exists, so it surfaces like 5xx and network failures.
 */
function isEnumerationClientError(error: unknown): boolean {
  return (
    error instanceof AimeeError &&
    error.statusCode >= 400 &&
    error.statusCode < 500 &&
    error.statusCode !== 429
  );
}

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
    const registered = await sdk.storefront.auth.register({
      email,
      password,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    });
    // The store requires email verification: no tokens until it is confirmed.
    if (registered.status === 'pending_verification') {
      return {
        ok: false,
        formError:
          'Check your email to verify your account, then sign in.',
      };
    }
    setSessionCookies(
      await cookies(),
      registered.accessToken,
      registered.refreshToken
    );
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
  const refreshToken = store.get(CUSTOMER_REFRESH_COOKIE)?.value;

  if (accessToken) {
    try {
      // With the refresh token only this session is revoked, not every device.
      await sdk.storefront
        .withCustomer(accessToken)
        .auth.logout(refreshToken ? { refreshToken } : {});
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
  } catch (error) {
    // 4xx stays indistinguishable from success so the response does not
    // reveal whether an account exists. Outages return a generic error.
    if (!isEnumerationClientError(error)) {
      return { ok: false, formError: GENERIC_ERROR };
    }
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
