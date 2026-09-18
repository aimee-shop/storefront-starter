'use server';

import { revalidatePath } from 'next/cache';
import type { AuthResult } from '@/lib/auth-form';
import { getCustomerSessionWithToken } from '@/lib/customer-session';
import type { VaultSetupIntent } from '@/lib/setup-intent';
import {
  attachPaymentMethod,
  createSetupIntent,
  detachPaymentMethod,
  PaymentMethodsApiError,
  setDefaultPaymentMethod,
} from './payments-api';

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const UNAUTH_ERROR = 'Please sign in to manage your payment methods.';
const UNAVAILABLE_ERROR =
  'Payment methods are temporarily unavailable. Please try again later.';
const NOT_FOUND_ERROR = 'That payment method could not be found.';
const SAVE_ERROR = 'Could not save this card. Please try again.';

export type CreateSetupIntentResult =
  | ({ ok: true } & VaultSetupIntent)
  | { ok: false; formError?: string };

async function requireCustomerSession() {
  const session = await getCustomerSessionWithToken();
  if (!session) return null;
  return session;
}

function mapApiError(error: unknown): { ok: false; formError: string } {
  if (error instanceof PaymentMethodsApiError) {
    if (error.status === 401) {
      return { ok: false, formError: UNAUTH_ERROR };
    }
    if (error.status === 404) {
      return { ok: false, formError: NOT_FOUND_ERROR };
    }
    if (error.status === 400 || error.status === 409) {
      return { ok: false, formError: SAVE_ERROR };
    }
    if (
      error.status === 403 ||
      error.status === 502 ||
      error.status === 503
    ) {
      return { ok: false, formError: UNAVAILABLE_ERROR };
    }
  }
  return { ok: false, formError: GENERIC_ERROR };
}

export async function removePaymentMethodAction(
  paymentMethodId: string
): Promise<AuthResult> {
  if (!paymentMethodId) {
    return { ok: false, formError: NOT_FOUND_ERROR };
  }

  const session = await requireCustomerSession();
  if (!session) return { ok: false, formError: UNAUTH_ERROR };

  try {
    await detachPaymentMethod(session.accessToken, paymentMethodId);
  } catch (error) {
    return mapApiError(error);
  }

  revalidatePath('/account/payment-methods');
  return { ok: true };
}

export async function setDefaultPaymentMethodAction(
  paymentMethodId: string
): Promise<AuthResult> {
  if (!paymentMethodId) {
    return { ok: false, formError: NOT_FOUND_ERROR };
  }

  const session = await requireCustomerSession();
  if (!session) return { ok: false, formError: UNAUTH_ERROR };

  try {
    await setDefaultPaymentMethod(session.accessToken, paymentMethodId);
  } catch (error) {
    return mapApiError(error);
  }

  revalidatePath('/account/payment-methods');
  return { ok: true };
}

export async function createSetupIntentAction(): Promise<CreateSetupIntentResult> {
  const session = await requireCustomerSession();
  if (!session) return { ok: false, formError: UNAUTH_ERROR };

  try {
    const intent = await createSetupIntent(session.accessToken);
    return { ok: true, ...intent };
  } catch (error) {
    return mapApiError(error);
  }
}

export async function attachPaymentMethodAction(
  setupIntentId: string
): Promise<AuthResult> {
  if (!setupIntentId) {
    return { ok: false, formError: SAVE_ERROR };
  }

  const session = await requireCustomerSession();
  if (!session) return { ok: false, formError: UNAUTH_ERROR };

  try {
    await attachPaymentMethod(session.accessToken, setupIntentId);
  } catch (error) {
    return mapApiError(error);
  }

  revalidatePath('/account/payment-methods');
  return { ok: true };
}
