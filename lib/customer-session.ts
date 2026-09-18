import 'server-only';

import { cookies } from 'next/headers';
import { AuthenticationError, NotFoundError } from '@aimee.shop/sdk';
import type { StorefrontCustomerDto } from '@aimee.shop/sdk';
import { sdk } from './sdk';
import { CUSTOMER_REFRESH_COOKIE, CUSTOMER_TOKEN_COOKIE } from './customer-auth';

export interface CustomerSession {
  customer: StorefrontCustomerDto;
  /** The access token that actually validated (may be a freshly refreshed one). */
  accessToken: string;
}

/**
 * Resolve the signed-in customer AND the working access token, or null.
 *
 * Reads the access-token cookie and validates it against Core API via
 * `withCustomer(token).auth.me()`. If the token is missing or expired, falls
 * back to the refresh token for a one-shot refresh + retry.
 *
 * The refreshed access token is used in-memory for this request only: RSC
 * renders cannot set cookies, so the new token is not persisted here. The
 * next mutating server action (sign in/out) re-persists cookies; until then
 * each render pays one extra refresh call, which is acceptable.
 *
 * Returns null (logged-out UI, never a crash) when both tokens are absent or
 * invalid, or when the customer no longer exists.
 */
export async function getCustomerSessionWithToken(): Promise<CustomerSession | null> {
  const store = await cookies();
  const accessToken = store.get(CUSTOMER_TOKEN_COOKIE)?.value;
  const refreshToken = store.get(CUSTOMER_REFRESH_COOKIE)?.value;

  if (accessToken) {
    try {
      const customer = await sdk.storefront.withCustomer(accessToken).auth.me();
      return { customer, accessToken };
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      if (!(error instanceof AuthenticationError)) throw error;
      // Expired/invalid access token: fall through to refresh.
    }
  }

  if (!refreshToken) return null;

  try {
    const refreshed = await sdk.storefront.auth.refresh(refreshToken);
    const customer = await sdk.storefront
      .withCustomer(refreshed.accessToken)
      .auth.me();
    return { customer, accessToken: refreshed.accessToken };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof NotFoundError) {
      return null;
    }
    throw error;
  }
}

/** Resolve just the signed-in customer from the session cookies, or null. */
export async function getCustomerSession(): Promise<StorefrontCustomerDto | null> {
  const session = await getCustomerSessionWithToken();
  return session?.customer ?? null;
}
