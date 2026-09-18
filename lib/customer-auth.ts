import 'server-only';

import type { cookies } from 'next/headers';
import { config } from './config';

/**
 * Customer session cookie definitions.
 *
 * Tokens live ONLY in httpOnly cookies -- never localStorage or client state.
 * The access token mirrors the Cognito access token TTL (1 hour); the refresh
 * token mirrors the Cognito refresh TTL (30 days). Core API does not rotate
 * refresh tokens, so the refresh cookie is only ever set at register/login.
 */
export const CUSTOMER_TOKEN_COOKIE = 'aimee_customer_token';
export const CUSTOMER_REFRESH_COOKIE = 'aimee_customer_refresh';

const TOKEN_MAX_AGE = 60 * 60; // 1 hour
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: !config.isDev,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function setSessionCookies(
  store: CookieStore,
  accessToken: string,
  refreshToken?: string
): void {
  store.set(CUSTOMER_TOKEN_COOKIE, accessToken, cookieOptions(TOKEN_MAX_AGE));
  if (refreshToken) {
    store.set(CUSTOMER_REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_MAX_AGE));
  }
}

export function clearSessionCookies(store: CookieStore): void {
  store.delete(CUSTOMER_TOKEN_COOKIE);
  store.delete(CUSTOMER_REFRESH_COOKIE);
}
