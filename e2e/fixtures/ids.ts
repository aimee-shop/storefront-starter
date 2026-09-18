/** Stable fixture IDs shared by mock API + smoke assertions. */

export const FIXTURE = {
  storeId: 'store-e2e-1',
  tenantId: 'tenant-e2e-1',
  productId: 'prod-e2e-1',
  productSlug: 'e2e-smoke-widget',
  productName: 'E2E Smoke Widget',
  variantId: 'var-e2e-1',
  cartId: 'cart-e2e-1',
  guestToken: 'guest-tok-e2e-1',
  lineItemId: 'line-e2e-1',
  checkoutId: 'chk-e2e-1',
  shippingRateId: 'rate-e2e-standard',
  customerId: 'cust-e2e-1',
  customerEmail: 'e2e@example.com',
  customerPassword: 'E2eTestPass1!',
  accessToken: 'e2e-access-token',
  refreshToken: 'e2e-refresh-token',
  orderId: 'order-e2e-1',
  orderNumber: 'ORD-E2E-1001',
  paymentIntentId: 'pi_e2e_mock_1',
  paymentId: 'pay_e2e_1',
  clientSecret: 'pi_e2e_mock_1_secret_e2e',
  // Public test-shaped key only -- never a Stripe secret. Real Stripe is mocked.
  publishableKey: 'pk_test_e2e_mock_not_a_real_key',
} as const;
