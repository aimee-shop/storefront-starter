/**
 * Stripe mocking for e2e -- no Stripe secret key in CI.
 *
 * Strategy: fulfill js.stripe.com/clover/stripe.js with a minimal Stripe.js that
 * satisfies @stripe/react-stripe-js validation:
 *   elements + createToken + createPaymentMethod + confirmCardPayment
 * so <Elements> mounts, CardElement mounts without iframes, and onReady fires.
 */

import type { Page } from '@playwright/test';
import { FIXTURE } from '../fixtures/ids';

/** Minimal Stripe.js stub served instead of the real CDN bundle. */
export const STRIPE_JS_STUB = `
(function () {
  function noop() {}
  function CardElement() {
    this._mounted = false;
  }
  CardElement.prototype.mount = function (el) {
    this._mounted = true;
    if (el && el.setAttribute) {
      el.setAttribute('data-e2e-stripe-card', 'mounted');
      el.innerHTML = '<div role="group" aria-label="Credit or debit card">Mock card field</div>';
    }
  };
  CardElement.prototype.unmount = noop;
  CardElement.prototype.destroy = noop;
  CardElement.prototype.on = function () { return this; };
  CardElement.prototype.off = function () { return this; };
  CardElement.prototype.update = noop;
  CardElement.prototype.focus = noop;
  CardElement.prototype.blur = noop;
  CardElement.prototype.clear = noop;

  function Elements() {
    this._card = null;
  }
  Elements.prototype.create = function (type) {
    // react-stripe-js CardElement calls create('card', options)
    var el = new CardElement();
    if (type === 'card' || type === 'cardNumber') {
      this._card = el;
    }
    return el;
  };
  Elements.prototype.getElement = function () {
    return this._card;
  };
  Elements.prototype.update = noop;

  function StripeInstance() {
    this._elements = null;
  }
  StripeInstance.prototype.elements = function () {
    this._elements = new Elements();
    return this._elements;
  };
  // Required by @stripe/react-stripe-js isStripe shape check
  StripeInstance.prototype.createToken = function () {
    return Promise.resolve({ token: { id: 'tok_e2e_mock' }, error: undefined });
  };
  StripeInstance.prototype.createPaymentMethod = function () {
    return Promise.resolve({
      paymentMethod: { id: 'pm_e2e_mock' },
      error: undefined,
    });
  };
  StripeInstance.prototype.confirmCardPayment = function () {
    return Promise.resolve({
      paymentIntent: {
        id: ${JSON.stringify(FIXTURE.paymentIntentId)},
        status: 'succeeded',
      },
      error: undefined,
    });
  };
  StripeInstance.prototype._registerWrapper = noop;
  StripeInstance.prototype.registerAppInfo = noop;

  function Stripe() {
    return new StripeInstance();
  }
  // @stripe/stripe-js pure expects version "clover" for pk_test keys
  Stripe.version = 'clover';
  window.Stripe = Stripe;
})();
`;

/**
 * Install browser routes so @stripe/stripe-js/pure never hits the real CDN
 * or Stripe API. Call before navigation into the payment step (or at test start).
 */
export async function installStripeMocks(page: Page): Promise<void> {
  await page.route(/https:\/\/js\.stripe\.com\/.*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: STRIPE_JS_STUB,
    });
  });

  await page.route(/https:\/\/api\.stripe\.com\/.*/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: FIXTURE.paymentIntentId,
        object: 'payment_intent',
        status: 'succeeded',
        client_secret: FIXTURE.clientSecret,
      }),
    });
  });
}
