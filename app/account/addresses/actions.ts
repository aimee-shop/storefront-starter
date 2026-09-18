'use server';

import { revalidatePath } from 'next/cache';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from '@aimee.shop/sdk';
import type { DefaultAddressType } from '@aimee.shop/sdk';
import type { ZodError } from 'zod';
import {
  interpretAddressValidationResult,
  isSoftValidationFailure,
} from '@/lib/address-book';
import { customerSdk } from '@/lib/customer-sdk';
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

/**
 * Best-effort external validation. When the provider is unavailable or the
 * call fails for non-validation reasons, we still allow the save path to
 * proceed so local form schema remains the hard gate.
 */
async function validateAddressDataInline(
  customerId: string,
  customers: ReturnType<typeof customerSdk>['customers'],
  payload: ReturnType<typeof toAddressPayload>
): Promise<AuthResult | null> {
  try {
    const result = await customers.validateAddressData(customerId, {
      address1: payload.address1,
      address2: payload.address2,
      city: payload.city,
      state: payload.state,
      zip: payload.zip,
      country: payload.country,
    });
    // Surface a clear form-level message; attach field hints when the
    // provider flags specific parts via standardized suggestions.
    return interpretAddressValidationResult(result, payload);
  } catch (error) {
    // Provider missing / 501 / network: do not block CRUD.
    // Auth/permission failures still surface -- validation shares the same
    // customers permission surface as CRUD.
    if (!isSoftValidationFailure(error)) {
      return mapSdkError(error);
    }
    return null;
  }
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
  const customers = customerSdk(session.accessToken).customers;
  const validationError = await validateAddressDataInline(
    session.customer.id,
    customers,
    payload
  );
  if (validationError) return validationError;

  try {
    await customers.addAddress(session.customer.id, payload);
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
  const customers = customerSdk(session.accessToken).customers;
  const validationError = await validateAddressDataInline(
    session.customer.id,
    customers,
    payload
  );
  if (validationError) return validationError;

  try {
    await customers.updateAddress(session.customer.id, addressId, payload);
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
    await customerSdk(session.accessToken).customers.deleteAddress(
      session.customer.id,
      addressId
    );
  } catch (error) {
    return mapSdkError(error);
  }

  revalidatePath('/account/addresses');
  return { ok: true };
}

export async function setDefaultAddressAction(
  addressId: string,
  type: DefaultAddressType
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
    await customerSdk(session.accessToken).customers.setDefaultAddress(
      session.customer.id,
      addressId,
      type
    );
  } catch (error) {
    return mapSdkError(error);
  }

  revalidatePath('/account/addresses');
  return { ok: true };
}
