import 'server-only';

import { config } from '@/lib/config';
import {
  isValidSetupIntent,
  type VaultSetupIntent,
} from '@/lib/setup-intent';
import type { SavedPaymentMethod } from './types';

export type { SavedPaymentMethod };

/**
 * Shopper saved-card CRUD is core-api HTTP (DEP-76):
 * GET/POST /v1/storefront/payment-methods*.
 * Auth is the storefront key + customer JWT. customerId is never sent --
 * core-api resolves it via StorefrontAuthService.resolveCustomer.
 * There is no public @aimee.shop/sdk vault client; do not add one.
 */

export class PaymentMethodsApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'PaymentMethodsApiError';
  }
}

function coreApiBaseUrl(): string {
  const base = config.coreApiUrl;
  if (!base) {
    throw new PaymentMethodsApiError(
      'Payment methods are not configured (missing API URL).',
      503
    );
  }
  return base.replace(/\/$/, '');
}

function requireApiKey(): string {
  const apiKey = config.apiKey;
  if (!apiKey) {
    throw new PaymentMethodsApiError(
      'Payment methods are not configured (missing API key).',
      503
    );
  }
  return apiKey;
}

function authHeaders(accessToken: string): Record<string, string> {
  if (!accessToken) {
    throw new PaymentMethodsApiError(
      'Payment methods request is unauthenticated.',
      401
    );
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': requireApiKey(),
    Authorization: `Bearer ${accessToken}`,
  };
  if (config.storeId) {
    headers['x-store-id'] = config.storeId;
  }
  return headers;
}

function endpoint(path = ''): string {
  return `${coreApiBaseUrl()}/v1/storefront/payment-methods${path}`;
}

function toSavedPaymentMethod(raw: unknown): SavedPaymentMethod | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.customerId !== 'string') return null;
  return {
    id: r.id,
    customerId: r.customerId,
    type: typeof r.type === 'string' ? r.type : 'card',
    cardBrand: typeof r.cardBrand === 'string' ? r.cardBrand : null,
    cardLastFour: typeof r.cardLastFour === 'string' ? r.cardLastFour : null,
    cardExpMonth: typeof r.cardExpMonth === 'number' ? r.cardExpMonth : null,
    cardExpYear: typeof r.cardExpYear === 'number' ? r.cardExpYear : null,
    isDefault: r.isDefault === true,
  };
}

async function parseErrorStatus(response: Response): Promise<never> {
  // Log status only -- never upstream body (may contain sensitive provider data).
  console.error(
    `[payment-methods] request failed: status=${response.status}`
  );
  throw new PaymentMethodsApiError(
    `Payment methods request failed (${response.status})`,
    response.status
  );
}

async function request(
  accessToken: string,
  path: string,
  init: RequestInit
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(endpoint(path), {
      method: init.method,
      headers: authHeaders(accessToken),
      body: init.body,
      cache: 'no-store',
    });
  } catch {
    throw new PaymentMethodsApiError(
      'Could not reach the payment service.',
      503
    );
  }
  return response;
}

export async function listPaymentMethods(
  accessToken: string
): Promise<SavedPaymentMethod[]> {
  const response = await request(accessToken, '', { method: 'GET' });

  if (!response.ok) {
    await parseErrorStatus(response);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) return [];
  return data
    .map(toSavedPaymentMethod)
    .filter((pm): pm is SavedPaymentMethod => pm !== null);
}

export async function setDefaultPaymentMethod(
  accessToken: string,
  paymentMethodId: string
): Promise<SavedPaymentMethod> {
  const response = await request(accessToken, '/default', {
    method: 'POST',
    body: JSON.stringify({ paymentMethodId }),
  });

  if (!response.ok) {
    await parseErrorStatus(response);
  }

  const data: unknown = await response.json();
  const pm = toSavedPaymentMethod(data);
  if (!pm) {
    throw new PaymentMethodsApiError(
      'Payment service returned an incomplete response.',
      502
    );
  }
  return pm;
}

export async function detachPaymentMethod(
  accessToken: string,
  paymentMethodId: string
): Promise<void> {
  const response = await request(
    accessToken,
    `/${encodeURIComponent(paymentMethodId)}`,
    { method: 'DELETE' }
  );

  if (!response.ok && response.status !== 204) {
    await parseErrorStatus(response);
  }
}

export async function createSetupIntent(
  accessToken: string
): Promise<VaultSetupIntent> {
  const response = await request(accessToken, '/setup-intents', {
    method: 'POST',
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    await parseErrorStatus(response);
  }

  const data: unknown = await response.json();
  const raw =
    data && typeof data === 'object'
      ? (data as Partial<VaultSetupIntent>)
      : null;
  if (!isValidSetupIntent(raw)) {
    throw new PaymentMethodsApiError(
      'Payment service returned an incomplete response.',
      502
    );
  }
  return raw;
}

export async function attachPaymentMethod(
  accessToken: string,
  setupIntentId: string
): Promise<SavedPaymentMethod> {
  const response = await request(accessToken, '/attach', {
    method: 'POST',
    body: JSON.stringify({ setupIntentId }),
  });

  if (!response.ok) {
    await parseErrorStatus(response);
  }

  const data: unknown = await response.json();
  const pm = toSavedPaymentMethod(data);
  if (!pm) {
    throw new PaymentMethodsApiError(
      'Payment service returned an incomplete response.',
      502
    );
  }
  return pm;
}
