import { describe, expect, it } from 'vitest';
import {
  isCustomerConsentGranted,
  parseConsentCategories,
  readConsentCategoriesFromDocumentCookie,
} from './customer-consent';

describe('customer-consent', () => {
  it('parses JSON and comma-separated categories', () => {
    expect(parseConsentCategories('["marketing","analytics"]')).toEqual([
      'marketing',
      'analytics',
    ]);
    expect(parseConsentCategories('marketing, analytics')).toEqual([
      'marketing',
      'analytics',
    ]);
    expect(parseConsentCategories(undefined)).toEqual([]);
  });

  it('grants only listed categories unless grantAll', () => {
    expect(isCustomerConsentGranted('marketing', ['marketing'])).toBe(true);
    expect(isCustomerConsentGranted('marketing', ['analytics'])).toBe(false);
    expect(
      isCustomerConsentGranted('marketing', [], { grantAll: true }),
    ).toBe(true);
  });

  it('reads cookie from document cookie string', () => {
    const cookie =
      'other=1; aimee_consent_categories=%5B%22marketing%22%5D; x=y';
    expect(readConsentCategoriesFromDocumentCookie(cookie)).toEqual([
      'marketing',
    ]);
  });
});
