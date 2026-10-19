'use server';

import { revalidatePath } from 'next/cache';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@aimee.shop/sdk';
import type { StorefrontDefaultAddressType } from '@aimee.shop/sdk';
import type { ZodError } from 'zod';
import { sdk } from '@/lib/sdk';
import { getCustomerSessionWithToken } from '@/lib/customer-session';
import type { AuthResult } from '@/lib/auth-form';
import {
  addressSchema,
  type AddressFormValues,
} from '@/lib/validations/address';

const GENERIC_ERROR = 'Something went wrong. Please try again.';
const UNAUTH_ERROR = 'Please sign in to manage your addresses.';
const FORBIDDEN_ERROR =
  'Address management is not available for this store yet. Please try again later.';

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

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toAddressPayload(values: AddressFormValues) {
  return {
    type: values.type,
    firstName: emptyToUndefined(values.firstName),
    lastName: emptyToUndefined(values.lastName),
    label: emptyToUndefined(values.label),
    address1: values.address1.trim(),
    address2: emptyToUndefined(values.address2),
    city: values.city.trim(),
    state: emptyToUndefined(values.state),
    zip: values.zip.trim(),
    country: values.country,
    phone: emptyToUndefined(values.phone),
  };
}

async function requireCustomerSession() {
  const session = await getCustomerSessionWithToken();
  if (!session) return null;
  return session;
}

function mapSdkError(error: unknown): AuthResult {
  if (error instanceof AuthenticationError) {
    return { ok: false, formError: UNAUTH_ERROR };
  }
  if (error instanceof AuthorizationError) {
    return { ok: false, formError: FORBIDDEN_ERROR };
  }
  if (error instanceof NotFoundError) {
    return { ok: false, formError: 'That address could not be found.' };
  }
  if (error instanceof ValidationError) {
    return {
      ok: false,
      formError: 'Please check the address details and try again.',
    };
  }
  return { ok: false, formError: GENERIC_ERROR };
}

export async function createAddressAction(
  input: AddressFormValues
): Promise<AuthResult> {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  const session = await requireCustomerSession();
  if (!session) return { ok: false, formError: UNAUTH_ERROR };

  const payload = toAddressPayload(parsed.data);
  try {
    await sdk.storefront.withCustomer(session.accessToken).addresses.create(payload);
  } catch (error) {
    return mapSdkError(error);
  }

  revalidatePath('/account/addresses');
  return { ok: true };
}

export async function updateAddressAction(
  addressId: string,
  input: AddressFormValues
): Promise<AuthResult> {
  if (!addressId) {
    return { ok: false, formError: 'That address could not be found.' };
  }

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  const session = await requireCustomerSession();
  if (!session) return { ok: false, formError: UNAUTH_ERROR };

  const payload = toAddressPayload(parsed.data);
  try {
    await sdk.storefront
      .withCustomer(session.accessToken)
      .addresses.update(addressId, payload);
  } catch (error) {
    return mapSdkError(error);
  }

  revalidatePath('/account/addresses');
  return { ok: true };
}

export async function deleteAddressAction(
  addressId: string
): Promise<AuthResult> {
  if (!addressId) {
    return { ok: false, formError: 'That address could not be found.' };
  }

  const session = await requireCustomerSession();
  if (!session) return { ok: false, formError: UNAUTH_ERROR };

  try {
    await sdk.storefront
      .withCustomer(session.accessToken)
      .addresses.delete(addressId);
  } catch (error) {
    return mapSdkError(error);
  }

  revalidatePath('/account/addresses');
  return { ok: true };
}

export async function setDefaultAddressAction(
  addressId: string,
  type: StorefrontDefaultAddressType
): Promise<AuthResult> {
  if (!addressId) {
    return { ok: false, formError: 'That address could not be found.' };
  }
  if (type !== 'billing' && type !== 'shipping') {
    return {
      ok: false,
      formError: 'Only billing and shipping addresses can be set as default.',
    };
  }

  const session = await requireCustomerSession();
  if (!session) return { ok: false, formError: UNAUTH_ERROR };

  try {
    await sdk.storefront
      .withCustomer(session.accessToken)
      .addresses.setDefault(addressId, type);
  } catch (error) {
    return mapSdkError(error);
  }

  revalidatePath('/account/addresses');
  return { ok: true };
}
