import { expect, type Page } from '@playwright/test';
import { FIXTURE } from '../fixtures/ids';
import { navigateTo, ROUTES } from './navigation';

export async function signInAsE2ECustomer(page: Page): Promise<void> {
  await navigateTo(page, ROUTES.account);
  await expect(page.getByRole('heading', { name: 'My Account' })).toBeVisible();

  await page.getByLabel('Email').fill(FIXTURE.customerEmail);
  await page.getByLabel('Password').fill(FIXTURE.customerPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Logged-in account shows customer name from mock profile.
  await expect(page.getByRole('heading', { name: 'E2E Shopper' })).toBeVisible({
    timeout: 15_000,
  });
}

export async function fillShippingAddress(page: Page): Promise<void> {
  await page.getByLabel('Email').fill(FIXTURE.customerEmail);
  await page.getByLabel('First name').fill('E2E');
  await page.getByLabel('Last name').fill('Shopper');
  await page.getByLabel('Address', { exact: true }).fill('1 Test Street');
  await page.getByLabel('City').fill('Austin');
  await page.getByLabel('State / province (optional)').fill('TX');
  await page.getByLabel('Postal code (optional)').fill('78701');
  await page.getByLabel('Country').fill('US');
  await page.getByRole('button', { name: 'Continue to shipping' }).click();
}

export async function selectFirstShippingRate(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Shipping method' })).toBeVisible({
    timeout: 15_000,
  });
  // Radio label text from mock rate name.
  await page.getByText('Standard Shipping', { exact: false }).click();
  // Wait for payment step (workflow advances after select + totals).
  await expect(page.getByText('Card details')).toBeVisible({ timeout: 30_000 });
}

/**
 * Payment form is dynamically imported and Stripe is lazy-loaded via /pure.
 * Wait until the mock CardElement mounts (onReady needs stripe + elements).
 * Pay now stays enabled even when confirmRef is null -- do not use that alone.
 */
export async function waitForPaymentFormReady(page: Page): Promise<void> {
  await expect(page.getByText('Card details')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-e2e-stripe-card="mounted"]')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('button', { name: 'Pay now' })).toBeEnabled();
  // Mock card mount implies Elements + useStripe/useElements ready; onReady
  // runs in the same commit after mount.
}
