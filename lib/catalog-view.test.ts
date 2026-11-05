import { describe, expect, it } from 'vitest';
import type { Product, SearchResultItem } from '@aimee.shop/sdk';
import { formatListedPrice, formatMoney } from './format';
import {
  searchItemToProduct,
  toProductDetail,
  toStorefrontProduct,
} from './catalog-view';

function baseProduct(): Product {
  return {
    id: 'prod-1',
    tenantId: 'ten-1',
    storeId: 'store-1',
    name: 'Hat',
    slug: 'hat',
    productType: 'good',
    isEnabled: true,
    isAvailable: true,
    isBackorderedAllowed: false,
    isInventoryTracked: true,
    isGoogleCheckoutEligible: false,
    isNofollow: false,
    isNoindex: false,
    isReviewsEnabled: true,
    isVariantRequired: false,
    version: 1,
    openaiEnableSearch: false,
    openaiEnableCheckout: false,
    tags: ['summer'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };
}

describe('toStorefrontProduct', () => {
  it('reads cent-string price range bounds as minor units', () => {
    const product = baseProduct();
    Object.assign(product, {
      price: 2000,
      compareAtPrice: null,
      images: [{ url: 'https://cdn.example/a.jpg', alt: null }],
      priceRange: { min: '1500', max: '2500', currency: 'USD' },
    });

    expect(toStorefrontProduct(product)).toEqual({
      id: 'prod-1',
      slug: 'hat',
      name: 'Hat',
      price: 2000,
      compareAtPrice: null,
      images: [{ url: 'https://cdn.example/a.jpg', alt: null }],
      priceRange: { min: 1500, max: 2500, currency: 'USD' },
    });
  });

  it('does not rescale string bounds by the currency decimal places', () => {
    const yen = baseProduct();
    Object.assign(yen, {
      priceRange: { min: '500', max: '500', currency: 'JPY' },
    });
    expect(toStorefrontProduct(yen).priceRange).toEqual({
      min: 500,
      max: 500,
      currency: 'JPY',
    });

    const dinar = baseProduct();
    Object.assign(dinar, {
      priceRange: { min: '1500', max: '2000', currency: 'KWD' },
    });
    expect(toStorefrontProduct(dinar).priceRange).toEqual({
      min: 1500,
      max: 2000,
      currency: 'KWD',
    });
  });

  it('keeps numeric bounds in minor units', () => {
    const product = baseProduct();
    Object.assign(product, {
      priceRange: { min: 1500, max: 2500, currency: 'USD' },
    });
    expect(toStorefrontProduct(product).priceRange).toEqual({
      min: 1500,
      max: 2500,
      currency: 'USD',
    });
  });

  it('keeps a null price range and omits a missing one', () => {
    expect(toStorefrontProduct(baseProduct()).priceRange).toBeUndefined();
    const product = baseProduct();
    Object.assign(product, { priceRange: null });
    expect(toStorefrontProduct(product).priceRange).toBeNull();
  });

  it('drops a price range whose bounds are empty, decimal, or not numeric', () => {
    const empty = baseProduct();
    Object.assign(empty, {
      priceRange: { min: '', max: '1500', currency: 'USD' },
    });
    expect(toStorefrontProduct(empty).priceRange).toBeUndefined();

    const junk = baseProduct();
    Object.assign(junk, {
      priceRange: { min: '   ', max: '1500', currency: 'USD' },
    });
    expect(toStorefrontProduct(junk).priceRange).toBeUndefined();

    const text = baseProduct();
    Object.assign(text, {
      priceRange: { min: 'nope', max: '1500', currency: 'USD' },
    });
    expect(toStorefrontProduct(text).priceRange).toBeUndefined();

    const decimal = baseProduct();
    Object.assign(decimal, {
      priceRange: { min: '15.00', max: '15.00', currency: 'USD' },
    });
    expect(toStorefrontProduct(decimal).priceRange).toBeUndefined();
  });

  it('drops a price range without a currency', () => {
    const product = baseProduct();
    Object.assign(product, { priceRange: { min: '1500', max: '2500' } });
    expect(toStorefrontProduct(product).priceRange).toBeUndefined();
  });

  it('leaves price undefined when absent and null when set to null', () => {
    expect(toStorefrontProduct(baseProduct()).price).toBeUndefined();
    const product = baseProduct();
    Object.assign(product, { price: null });
    expect(toStorefrontProduct(product).price).toBeNull();
  });

  it('reads a top-level currency when price is set without a range', () => {
    const product = baseProduct();
    Object.assign(product, { price: 1800, currency: 'GBP' });
    expect(toStorefrontProduct(product)).toMatchObject({
      price: 1800,
      currency: 'GBP',
      priceRange: undefined,
    });
    expect(toProductDetail(product).currency).toBe('GBP');
  });
});

describe('searchItemToProduct', () => {
  it('reads product fields stored on the hit', () => {
    const hit: SearchResultItem = {
      id: 'hit-1',
      type: 'product',
      score: 1,
      source: {},
      data: {},
    };
    Object.assign(hit, {
      slug: 'hat',
      name: 'Hat',
      priceRange: { min: '1500', max: '1500', currency: 'USD' },
    });

    expect(searchItemToProduct(hit)).toEqual({
      id: 'hit-1',
      slug: 'hat',
      name: 'Hat',
      price: undefined,
      compareAtPrice: undefined,
      images: undefined,
      priceRange: { min: 1500, max: 1500, currency: 'USD' },
    });
  });

  it('reads product fields stored on hit.data', () => {
    const hit: SearchResultItem = {
      id: 'hit-2',
      type: 'product',
      score: 1,
      source: {},
      data: {
        slug: 'cap',
        name: 'Cap',
        price: null,
        priceRange: { min: '1000', max: '1250', currency: 'EUR' },
      },
    };

    expect(searchItemToProduct(hit)).toEqual({
      id: 'hit-2',
      slug: 'cap',
      name: 'Cap',
      price: null,
      compareAtPrice: undefined,
      images: undefined,
      priceRange: { min: 1000, max: 1250, currency: 'EUR' },
    });
  });

  it('reads a top-level currency from the hit when there is no price range', () => {
    const onHit: SearchResultItem = {
      id: 'hit-3',
      type: 'product',
      score: 1,
      source: {},
      data: {},
    };
    Object.assign(onHit, { slug: 'hat', name: 'Hat', price: 1800, currency: 'GBP' });
    expect(searchItemToProduct(onHit)).toMatchObject({
      price: 1800,
      currency: 'GBP',
      priceRange: undefined,
    });

    const inData: SearchResultItem = {
      id: 'hit-4',
      type: 'product',
      score: 1,
      source: {},
      data: { slug: 'cap', name: 'Cap', price: 900, currency: 'EUR' },
    };
    expect(searchItemToProduct(inData)).toMatchObject({
      price: 900,
      currency: 'EUR',
      priceRange: undefined,
    });
  });
});

describe('toProductDetail', () => {
  it('labels the PDP price the same as the cart line for that variant', () => {
    // core-api sends the range as cent strings and cart money as cent strings.
    const mug = baseProduct();
    Object.assign(mug, {
      priceRange: { min: '1200', max: '1200', currency: 'USD' },
    });
    const cartUnitPrice = '1200';

    expect(formatListedPrice(toProductDetail(mug))).toBe('$12.00');
    expect(formatListedPrice(toProductDetail(mug))).toBe(
      formatMoney(cartUnitPrice, 'USD')
    );
  });

  it('maps categories and a complete inventory summary', () => {
    const product = baseProduct();
    Object.assign(product, {
      description: 'Wool hat',
      categories: [{ id: 'c1', name: 'Hats', slug: 'hats' }, { id: 'c2' }],
      variants: [
        { sku: 'missing-id' },
        {
          id: 'v1',
          isInventoryTracked: false,
          inventory: {
            status: 'in_stock',
            totalOnHand: 4,
            totalAvailable: 3,
            totalReserved: 1,
            totalIncoming: 0,
            locationCount: 1,
          },
        },
      ],
    });

    const detail = toProductDetail(product);
    expect(detail.description).toBe('Wool hat');
    expect(detail.categories).toEqual([{ id: 'c1', name: 'Hats', slug: 'hats' }]);
    expect(detail.variants).toEqual([
      {
        id: 'v1',
        isInventoryTracked: false,
        inventory: {
          status: 'in_stock',
          totalOnHand: 4,
          totalAvailable: 3,
          totalReserved: 1,
          totalIncoming: 0,
          locationCount: 1,
          hasLowStockLocation: false,
        },
      },
    ]);
  });

  it('drops incomplete variants and keeps string inventory counts unscaled', () => {
    const product = baseProduct();
    Object.assign(product, {
      images: [{}, { url: '' }, { url: 'https://cdn.example/b.jpg', alt: 'Side' }],
      variants: [
        'nope',
        { id: 'v-bad', inventory: { status: 'mystery' } },
        {
          id: 'v-partial',
          inventory: { status: 'low_stock', totalOnHand: '4' },
        },
        {
          id: 'v-ok',
          isInventoryTracked: null,
          inventory: {
            status: 'backorder',
            totalOnHand: '4',
            totalAvailable: '3',
            totalReserved: '1',
            totalIncoming: '0',
            locationCount: '2',
            hasLowStockLocation: true,
          },
        },
      ],
    });

    const detail = toProductDetail(product);
    expect(detail.images).toEqual([
      { url: 'https://cdn.example/b.jpg', alt: 'Side' },
    ]);
    expect(detail.variants).toEqual([
      { id: 'v-bad', isInventoryTracked: undefined, inventory: null },
      { id: 'v-partial', isInventoryTracked: undefined, inventory: null },
      {
        id: 'v-ok',
        isInventoryTracked: null,
        inventory: {
          status: 'backorder',
          totalOnHand: 4,
          totalAvailable: 3,
          totalReserved: 1,
          totalIncoming: 0,
          locationCount: 2,
          hasLowStockLocation: true,
        },
      },
    ]);
  });
});

describe('searchItemToProduct misses', () => {
  it('returns null when the hit has no slug and name', () => {
    expect(
      searchItemToProduct({
        id: 'hit-3',
        type: 'product',
        score: 0,
        source: {},
        data: { name: 'Hat' },
      }),
    ).toBeNull();
  });
});
