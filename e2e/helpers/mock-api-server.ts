/**
 * Minimal Core + Payments HTTP mock for Playwright smoke tests.
 *
 * Both the Next.js server (RSC, server actions) and the browser SDK talk to
 * this process when NEXT_PUBLIC_CORE_API_URL / payments URL point here.
 * page.route() cannot intercept server-side fetches, so a shared mock is
 * required for PaymentIntent create and confirmation order lookup.
 *
 * Fixture shapes mirror unit tests in stores/cart-store.test.ts and
 * stores/checkout-store.test.ts.
 */

import http from 'http';
import { URL } from 'url';
import { FIXTURE } from '../fixtures/ids';

const now = '2026-07-01T00:00:00.000Z';

export const MOCK_API_PORT = Number(process.env.E2E_MOCK_API_PORT || 3099);
export const MOCK_API_URL =
  process.env.E2E_MOCK_API_URL || `http://127.0.0.1:${MOCK_API_PORT}`;

interface MockState {
  cartItems: Array<{
    id: string;
    productId: string;
    productVariantId: string;
    quantity: number;
    title: string;
    productName: string;
    sku: string;
    unitPrice: string;
    subtotal: string;
    storeId: string;
    requiresShipping: boolean;
    taxable: boolean;
  }>;
  cartId: string | null;
  /** Mirrors store features.checkout.guestCheckout (default true). */
  guestCheckout: boolean;
  checkout: {
    id: string;
    cartId: string;
    workflowState: string;
    status: string;
    shippingAddress?: Record<string, unknown>;
    shippingMethod?: string;
    shippingRateId?: string;
    customerId?: string;
  } | null;
}

function emptyState(): MockState {
  return { cartItems: [], cartId: null, checkout: null, guestCheckout: true };
}

let state: MockState = emptyState();

export function resetMockState() {
  state = emptyState();
}

const customer = {
  id: FIXTURE.customerId,
  email: FIXTURE.customerEmail,
  firstName: 'E2E',
  lastName: 'Shopper',
  phone: null,
  customerType: 'individual',
  isGuest: false,
};

function product() {
  return {
    id: FIXTURE.productId,
    name: FIXTURE.productName,
    slug: FIXTURE.productSlug,
    description: 'Deterministic product for Playwright smoke.',
    productType: 'physical',
    isAvailable: true,
    isEnabled: true,
    tags: [],
    // price is minor units so it matches cart unitPrice '2000'.
    // priceRange follows getPriceRanges: major-unit decimals plus currency.
    price: 2000,
    compareAtPrice: null,
    images: [],
    priceRange: { min: '20.00', max: '20.00', currency: 'USD' },
    categories: [],
    variants: [
      {
        id: FIXTURE.variantId,
        sku: 'E2E-SKU-1',
        options: [],
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

function cartPayload() {
  const items = state.cartItems;
  const subtotal = items.reduce((n, i) => n + Number(i.subtotal), 0);
  return {
    id: state.cartId ?? FIXTURE.cartId,
    tenantId: FIXTURE.tenantId,
    storeId: FIXTURE.storeId,
    status: 'active',
    guestToken: FIXTURE.guestToken,
    itemsCount: items.reduce((n, i) => n + i.quantity, 0),
    discountsApplied: [],
    subtotal: String(subtotal),
    discountTotal: '0',
    taxTotal: '0',
    shippingTotal: '0',
    total: String(subtotal),
    currency: 'USD',
    locale: 'en-US',
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
    items,
  };
}

function checkoutSession() {
  const c = state.checkout;
  if (!c) return null;
  const subtotal = state.cartItems.reduce((n, i) => n + Number(i.subtotal), 0);
  const shipping = c.shippingRateId ? 500 : 0;
  const tax = c.shippingRateId ? 160 : 0;
  const total = subtotal + shipping + tax;
  return {
    id: c.id,
    tenantId: FIXTURE.tenantId,
    storeId: FIXTURE.storeId,
    cartId: c.cartId,
    customerId: c.customerId ?? FIXTURE.customerId,
    status: c.status,
    workflowState: c.workflowState,
    revision: 1,
    useShippingAsBilling: true,
    subtotal: String(subtotal),
    discountTotal: '0',
    taxTotal: String(tax),
    shippingTotal: String(shipping),
    total: String(total),
    currency: 'USD',
    validationErrors: [],
    expiresAt: '2026-12-01T00:00:00.000Z',
    lastActivityAt: now,
    locale: 'en-US',
    countryCode: 'US',
    channel: 'web',
    metadata: {},
    createdAt: now,
    updatedAt: now,
    shippingAddress: c.shippingAddress,
    shippingMethod: c.shippingMethod,
    shippingRateId: c.shippingRateId,
  };
}

function totals() {
  const session = checkoutSession();
  return {
    revision: 1,
    subtotal: session?.subtotal ?? '2000',
    discountTotal: '0',
    taxTotal: session?.taxTotal ?? '160',
    shippingTotal: session?.shippingTotal ?? '500',
    total: session?.total ?? '2660',
    currency: 'USD',
    lineItems: [],
    taxBreakdown: [],
    discountBreakdown: [],
    shippingBreakdown: [],
    calculationMetadata: {
      calculationTimeMs: 1,
      servicesCalled: [],
      cacheStatus: 'miss',
    },
  };
}

function shippingRates() {
  return [
    {
      id: FIXTURE.shippingRateId,
      name: 'Standard Shipping',
      code: 'standard',
      cost: '500',
      currency: 'USD',
      estimatedDelivery: { minDays: 3, maxDays: 5, description: '3-5 business days' },
      carrier: { name: 'MockPost', service: 'Ground' },
      isRecommended: true,
      isAvailable: true,
    },
  ];
}

function order() {
  return {
    id: FIXTURE.orderId,
    orderNumber: FIXTURE.orderNumber,
    customerId: FIXTURE.customerId,
    status: 'confirmed',
    workflowState: 'paymentConfirmed',
    subtotalAmount: 2000,
    shippingAmount: 500,
    taxAmount: 160,
    discountAmount: 0,
    totalAmount: 2660,
    currency: 'USD',
    createdAt: now,
    estimatedDeliveryDate: null,
    metadata: {},
    shippingAddress: {
      firstName: 'E2E',
      lastName: 'Shopper',
      address1: '1 Test Street',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      country: 'US',
      countryName: 'United States',
    },
    orderItems: [
      {
        id: FIXTURE.lineItemId,
        productName: FIXTURE.productName,
        productSku: 'E2E-SKU-1',
        quantity: 1,
        unitPrice: 2000,
        totalPrice: 2000,
      },
    ],
  };
}

function sendJson(
  res: http.ServerResponse,
  status: number,
  body: unknown,
  extraHeaders: Record<string, string> = {}
) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, x-api-key, x-store-id, x-tenant-id',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    ...extraHeaders,
  });
  res.end(payload);
}

function sendEmpty(res: http.ServerResponse, status = 204) {
  res.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, x-api-key, x-store-id, x-tenant-id',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  });
  res.end();
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function match(
  method: string,
  pathname: string,
  wantMethod: string,
  pattern: RegExp
): RegExpMatchArray | null {
  if (method !== wantMethod) return null;
  return pathname.match(pattern);
}

export function createMockApiHandler() {
  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const method = (req.method || 'GET').toUpperCase();
    const url = new URL(req.url || '/', MOCK_API_URL);
    const path = url.pathname.replace(/\/$/, '') || '/';

    if (method === 'OPTIONS') {
      sendEmpty(res, 204);
      return;
    }

    // Health (optional global-setup probe)
    if (method === 'GET' && (path === '/health' || path === '/v1/health')) {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    // Test-only: reset cart/checkout state between smoke cases / retries.
    // Optional body: { guestCheckout?: boolean } to set store feature flag.
    if (method === 'POST' && path === '/__e2e/reset') {
      const body = (await readBody(req)) as { guestCheckout?: boolean } | undefined;
      resetMockState();
      if (typeof body?.guestCheckout === 'boolean') {
        state.guestCheckout = body.guestCheckout;
      }
      sendJson(res, 200, { ok: true, guestCheckout: state.guestCheckout });
      return;
    }

    // ---- CMS (build-time sitemap/blog; empty is fine) ----
    if (method === 'GET' && path.startsWith('/v1/content/')) {
      if (path.includes('/blog') && !path.includes('/blog/')) {
        sendJson(res, 200, { data: [], meta: { total: 0 } });
        return;
      }
      sendJson(res, 404, { message: 'Not found', statusCode: 404 });
      return;
    }

    // ---- Catalog / store (RSC) ----
    if (method === 'GET' && path === '/v1/products') {
      const p = product();
      sendJson(res, 200, { data: [p], meta: { total: 1, page: 1, limit: 12 } });
      return;
    }

    {
      const m = match(method, path, 'GET', /^\/v1\/products\/slug\/([^/]+)$/);
      if (m) {
        if (m[1] !== FIXTURE.productSlug) {
          sendJson(res, 404, { message: 'Not found', statusCode: 404 });
          return;
        }
        sendJson(res, 200, product());
        return;
      }
    }

    {
      const m = match(method, path, 'GET', /^\/v1\/products\/([^/]+)\/variants$/);
      if (m) {
        if (m[1] !== FIXTURE.productId) {
          sendJson(res, 404, { message: 'Not found', statusCode: 404 });
          return;
        }
        const [variant] = product().variants;
        sendJson(res, 200, [
          {
            ...variant,
            inventory: {
              totalOnHand: 10,
              totalAvailable: 10,
              totalReserved: 0,
              totalIncoming: 0,
              status: 'in_stock',
              locationCount: 1,
            },
          },
        ]);
        return;
      }
    }

    {
      const m = match(method, path, 'GET', /^\/v1\/products\/([^/]+)$/);
      if (m && m[1] !== 'slug' && m[1] !== 'search') {
        if (m[1] !== FIXTURE.productId) {
          sendJson(res, 404, { message: 'Not found', statusCode: 404 });
          return;
        }
        sendJson(res, 200, product());
        return;
      }
    }

    if (method === 'GET' && path === '/v1/categories') {
      // categories.list() expects a flat array (getTree iterates it).
      sendJson(res, 200, []);
      return;
    }

    if (method === 'GET' && path === '/v1/facets/options/facets') {
      sendJson(res, 200, { facets: {} });
      return;
    }

    if (method === 'GET' && path === '/v1/stores/default') {
      sendJson(res, 200, {
        id: FIXTURE.storeId,
        name: 'E2E Store',
        code: 'e2e',
        status: 'active',
      });
      return;
    }

    // Soft-404 for optional store extras (robots/ai-discovery probes).
    {
      const m = match(
        method,
        path,
        'GET',
        /^\/v1\/stores\/([^/]+)\/ai-discovery$/
      );
      if (m) {
        sendJson(res, 404, { message: 'Not found', statusCode: 404 });
        return;
      }
    }
    // Some clients strip the /v1 prefix in logs; accept bare path too.
    {
      const m = match(method, path, 'GET', /^\/stores\/([^/]+)\/ai-discovery$/);
      if (m) {
        sendJson(res, 404, { message: 'Not found', statusCode: 404 });
        return;
      }
    }

    {
      const m = match(
        method,
        path,
        'GET',
        /^\/v1\/stores\/([^/]+)\/configuration\/merged$/
      );
      if (m) {
        sendJson(res, 200, {
          storeId: m[1],
          themeSettings: {
            branding: { storeName: 'E2E Store' },
          },
          features: {
            checkout: { guestCheckout: state.guestCheckout },
          },
        });
        return;
      }
    }

    // ---- Auth (login + confirmation session) ----
    if (method === 'POST' && path === '/v1/storefront/auth/login') {
      const body = (await readBody(req)) as { email?: string; password?: string };
      if (
        body?.email === FIXTURE.customerEmail &&
        body?.password === FIXTURE.customerPassword
      ) {
        sendJson(res, 200, {
          customer,
          accessToken: FIXTURE.accessToken,
          refreshToken: FIXTURE.refreshToken,
        });
        return;
      }
      sendJson(res, 401, { message: 'Invalid credentials', statusCode: 401 });
      return;
    }

    if (method === 'POST' && path === '/v1/storefront/auth/refresh') {
      sendJson(res, 200, {
        accessToken: FIXTURE.accessToken,
        idToken: FIXTURE.accessToken,
      });
      return;
    }

    if (method === 'GET' && path === '/v1/storefront/auth/me') {
      sendJson(res, 200, customer);
      return;
    }

    if (method === 'POST' && path === '/v1/storefront/auth/logout') {
      sendEmpty(res, 204);
      return;
    }

    // ---- Orders (confirmation RSC via storefront.withCustomer) ----
    {
      const m = match(method, path, 'GET', /^\/v1\/storefront\/orders\/number\/([^/]+)$/);
      if (m) {
        if (decodeURIComponent(m[1]) !== FIXTURE.orderNumber) {
          sendJson(res, 404, { message: 'Not found', statusCode: 404 });
          return;
        }
        sendJson(res, 200, order());
        return;
      }
    }

    // ---- Carts (browser SDK) ----
    if (method === 'POST' && path === '/v1/carts') {
      state.cartId = FIXTURE.cartId;
      state.cartItems = [];
      sendJson(res, 201, cartPayload());
      return;
    }

    {
      const m = match(method, path, 'GET', /^\/v1\/carts\/([^/]+)$/);
      if (m) {
        if (!state.cartId) state.cartId = m[1];
        sendJson(res, 200, cartPayload());
        return;
      }
    }

    {
      const m = match(method, path, 'POST', /^\/v1\/carts\/([^/]+)\/items$/);
      if (m) {
        const body = (await readBody(req)) as {
          productId?: string;
          productVariantId?: string;
          quantity?: number;
        };
        state.cartId = m[1];
        const qty = body?.quantity ?? 1;
        state.cartItems = [
          {
            id: FIXTURE.lineItemId,
            productId: body?.productId ?? FIXTURE.productId,
            productVariantId: body?.productVariantId ?? FIXTURE.variantId,
            quantity: qty,
            title: FIXTURE.productName,
            productName: FIXTURE.productName,
            sku: 'E2E-SKU-1',
            unitPrice: '2000',
            subtotal: String(2000 * qty),
            storeId: FIXTURE.storeId,
            requiresShipping: true,
            taxable: true,
          },
        ];
        sendJson(res, 200, cartPayload());
        return;
      }
    }

    // ---- Checkout (browser + server PI path) ----
    // Guest create is gated in the storefront RSC (guestCheckout flag). Core-api
    // also enforces it; the browser storefront client uses a publishable key only
    // (no Authorization), so the mock does not re-check JWT here.
    if (method === 'POST' && path === '/v1/checkout/sessions') {
      const body = (await readBody(req)) as { cartId?: string };
      const cartId = body?.cartId ?? state.cartId ?? FIXTURE.cartId;
      state.checkout = {
        id: FIXTURE.checkoutId,
        cartId,
        workflowState: 'address_collection',
        status: 'open',
        customerId: FIXTURE.customerId,
      };
      sendJson(res, 201, checkoutSession());
      return;
    }

    {
      const m = match(method, path, 'GET', /^\/v1\/checkout\/sessions\/([^/]+)$/);
      if (m) {
        if (!state.checkout) {
          state.checkout = {
            id: m[1],
            cartId: state.cartId ?? FIXTURE.cartId,
            workflowState: 'address_collection',
            status: 'open',
            customerId: FIXTURE.customerId,
          };
        }
        sendJson(res, 200, checkoutSession());
        return;
      }
    }

    {
      const m = match(
        method,
        path,
        'PUT',
        /^\/v1\/checkout\/sessions\/([^/]+)\/shipping-address$/
      );
      if (m) {
        const body = (await readBody(req)) as Record<string, unknown>;
        if (!state.checkout) {
          state.checkout = {
            id: m[1],
            cartId: state.cartId ?? FIXTURE.cartId,
            workflowState: 'address_collection',
            status: 'open',
            customerId: FIXTURE.customerId,
          };
        }
        state.checkout.shippingAddress = body;
        state.checkout.workflowState = 'shipping_selection';
        sendJson(res, 200, checkoutSession());
        return;
      }
    }

    {
      const m = match(
        method,
        path,
        'GET',
        /^\/v1\/checkout\/sessions\/([^/]+)\/shipping-rates$/
      );
      if (m) {
        sendJson(res, 200, shippingRates());
        return;
      }
    }

    {
      const m = match(
        method,
        path,
        'PUT',
        /^\/v1\/checkout\/sessions\/([^/]+)\/shipping-method$/
      );
      if (m) {
        const body = (await readBody(req)) as {
          shippingMethod?: string;
          shippingRateId?: string;
        };
        if (!state.checkout) {
          state.checkout = {
            id: m[1],
            cartId: state.cartId ?? FIXTURE.cartId,
            workflowState: 'shipping_selection',
            status: 'open',
            customerId: FIXTURE.customerId,
          };
        }
        state.checkout.shippingMethod = body?.shippingMethod ?? 'Standard Shipping';
        state.checkout.shippingRateId =
          body?.shippingRateId ?? FIXTURE.shippingRateId;
        state.checkout.workflowState = 'payment_setup';
        sendJson(res, 200, checkoutSession());
        return;
      }
    }

    {
      const m = match(
        method,
        path,
        'POST',
        /^\/v1\/checkout\/sessions\/([^/]+)\/calculate-totals$/
      );
      if (m) {
        sendJson(res, 200, totals());
        return;
      }
    }

    {
      const m = match(
        method,
        path,
        'POST',
        /^\/v1\/checkout\/sessions\/([^/]+)\/complete$/
      );
      if (m) {
        if (state.checkout) {
          state.checkout.workflowState = 'complete';
          state.checkout.status = 'complete';
        }
        state.cartItems = [];
        sendJson(res, 200, {
          status: 'completed',
          orderId: FIXTURE.orderId,
          paymentConfirmation: {
            paymentIntentId: FIXTURE.paymentIntentId,
            paymentStatus: 'succeeded',
            amountPaid: totals().total,
            currency: 'USD',
            paymentMethod: 'card',
          },
          orderSummary: {
            orderNumber: FIXTURE.orderNumber,
            itemsCount: 1,
            totalAmount: totals().total,
            currency: 'USD',
          },
          completionMetadata: {},
          checkoutSessionId: m[1],
          completedAt: now,
        });
        return;
      }
    }

    // ---- checkout.preparePayment (server action prepareCheckoutPayment) ----
    if (
      method === 'POST' &&
      /^\/v1\/checkout\/sessions\/([^/]+)\/payment-intent$/.test(path)
    ) {
      sendJson(res, 200, {
        attemptId: 'attempt_e2e_1',
        revision: 1,
        provider: 'stripe',
        paymentId: FIXTURE.paymentId,
        paymentIntentId: FIXTURE.paymentIntentId,
        clientSecret: FIXTURE.clientSecret,
        publishableKey: FIXTURE.publishableKey,
        status: 'requires_payment_method',
        amount: totals().total,
        currency: 'USD',
      });
      return;
    }

    console.warn(`[mock-api] unhandled ${method} ${path}`);
    sendJson(res, 404, {
      message: `Mock API has no handler for ${method} ${path}`,
      statusCode: 404,
    });
  };
}

export function startMockApiServer(
  port = MOCK_API_PORT
): Promise<{ server: http.Server; url: string; port: number }> {
  resetMockState();
  const server = http.createServer(createMockApiHandler());
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const url = `http://127.0.0.1:${port}`;
      console.log(`[mock-api] listening on ${url}`);
      resolve({ server, url, port });
    });
  });
}
