import { test, expect, type Page } from '@playwright/test';
import { FIXTURE } from '../fixtures/ids';
import {
  fillShippingAddress,
  selectFirstShippingRate,
  signInAsE2ECustomer,
  waitForPaymentFormReady,
} from '../helpers/checkout';
import { navigateTo, ROUTES } from '../helpers/navigation';
import { MOCK_API_URL } from '../helpers/mock-api-server';
import { installStripeMocks } from '../helpers/stripe-mock';

/**
 * Browse -> cart -> checkout (mocked Stripe) -> confirmation.
 *
 * Core/Payments: e2e mock API (webServer script). Stripe: page.route stub
 * (no secret key). Confirmation ownership uses the same customer as login.
 */

async function resetMockApi(
  page: Page,
  options?: { guestCheckout?: boolean }
) {
  const reset = await page.request.post(`${MOCK_API_URL}/__e2e/reset`, {
    data: options ?? {},
  });
  expect(reset.ok()).toBeTruthy();
}

test.describe('Checkout smoke @smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API runs in the webServer process -- reset via HTTP, not import.
    await resetMockApi(page);
    await installStripeMocks(page);
  });

  test('when guest checkout is disabled, unsigned shoppers see sign-in', async ({
    page,
  }) => {
    await resetMockApi(page, { guestCheckout: false });

    await navigateTo(page, ROUTES.products);
    await expect(
      page.getByRole('link', { name: new RegExp(FIXTURE.productName, 'i') })
    ).toBeVisible({ timeout: 20_000 });

    await page
      .getByRole('link', { name: new RegExp(FIXTURE.productName, 'i') })
      .click();
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByRole('button', { name: 'Added to Cart' })).toBeVisible({
      timeout: 15_000,
    });

    await navigateTo(page, ROUTES.cart);
    await page.getByRole('link', { name: 'Proceed to Checkout' }).click();
    await expect(page).toHaveURL(/\/checkout/);

    await expect(
      page.getByRole('heading', { name: 'Sign in to checkout' })
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel('Email').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Contact and shipping' })
    ).toHaveCount(0);
  });

  test('when guest checkout is disabled, signed-in shoppers reach checkout', async ({
    page,
  }) => {
    await resetMockApi(page, { guestCheckout: false });
    await signInAsE2ECustomer(page);

    await navigateTo(page, ROUTES.products);
    await page
      .getByRole('link', { name: new RegExp(FIXTURE.productName, 'i') })
      .click();
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByRole('button', { name: 'Added to Cart' })).toBeVisible({
      timeout: 15_000,
    });

    await navigateTo(page, ROUTES.cart);
    await page.getByRole('link', { name: 'Proceed to Checkout' }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(
      page.getByRole('heading', { name: 'Contact and shipping' })
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole('heading', { name: 'Sign in to checkout' })
    ).toHaveCount(0);
  });

  test('signed-in shopper: browse, pay, see order confirmation', async ({
    page,
  }) => {
    // 1. Sign in so confirmation RSC has a customer session matching order.customerId
    await signInAsE2ECustomer(page);

    // 2. Browse catalog
    await navigateTo(page, ROUTES.products);
    await expect(
      page.getByRole('link', { name: new RegExp(FIXTURE.productName, 'i') })
    ).toBeVisible({ timeout: 20_000 });

    // 3. Open PDP + add to cart
    await page
      .getByRole('link', { name: new RegExp(FIXTURE.productName, 'i') })
      .click();
    await expect(page).toHaveURL(new RegExp(`/products/${FIXTURE.productSlug}`));
    await expect(
      page.getByRole('heading', { name: FIXTURE.productName })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByRole('button', { name: 'Added to Cart' })).toBeVisible({
      timeout: 15_000,
    });

    // 4. Cart -> checkout
    await navigateTo(page, ROUTES.cart);
    await expect(page.getByText(FIXTURE.productName)).toBeVisible();
    await page.getByRole('link', { name: 'Proceed to Checkout' }).click();
    await expect(page).toHaveURL(/\/checkout/);

    // 5. Contact + address
    await expect(
      page.getByRole('heading', { name: 'Contact and shipping' })
    ).toBeVisible({ timeout: 20_000 });
    await fillShippingAddress(page);

    // 6. Shipping
    await selectFirstShippingRate(page);

    // 7. Payment (lazy Stripe + dynamic import) -- wait for mount
    await waitForPaymentFormReady(page);
    await page.getByRole('button', { name: 'Pay now' }).click();

    // 8. Confirmation page with visible order number
    await expect(page).toHaveURL(
      new RegExp(
        `/checkout/confirmation\\?order=${encodeURIComponent(FIXTURE.orderNumber)}`
      ),
      { timeout: 30_000 }
    );
    await expect(
      page.getByRole('heading', { name: 'Order confirmed' })
    ).toBeVisible();
    await expect(page.getByText(FIXTURE.orderNumber)).toBeVisible();
  });

  test('guest shopper: browse, pay, see guest confirmation', async ({ page }) => {
    await navigateTo(page, ROUTES.products);
    await page
      .getByRole('link', { name: new RegExp(FIXTURE.productName, 'i') })
      .click();
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await expect(page.getByRole('button', { name: 'Added to Cart' })).toBeVisible({
      timeout: 15_000,
    });

    await navigateTo(page, ROUTES.cart);
    await page.getByRole('link', { name: 'Proceed to Checkout' }).click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(
      page.getByRole('heading', { name: 'Contact and shipping' })
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole('heading', { name: 'Sign in to checkout' })
    ).toHaveCount(0);

    await fillShippingAddress(page);
    await selectFirstShippingRate(page);
    await waitForPaymentFormReady(page);
    await page.getByRole('button', { name: 'Pay now' }).click();

    await expect(page).toHaveURL(
      new RegExp(
        `/checkout/confirmation\\?order=${encodeURIComponent(FIXTURE.orderNumber)}`
      ),
      { timeout: 30_000 }
    );
    await expect(
      page.getByRole('heading', { name: 'Order confirmed' })
    ).toBeVisible();
    await expect(page.getByText(FIXTURE.orderNumber)).toBeVisible();
    // Guest view offers account history CTA instead of order detail deep-link.
    await expect(
      page.getByRole('link', { name: 'Sign in for order history' })
    ).toBeVisible();
  });
});
