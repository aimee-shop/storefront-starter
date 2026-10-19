import type { Product, SearchResultItem } from '@aimee.shop/sdk';
import type { StorefrontProduct } from '@/components/products/ProductCard';
import type { VariantInventory } from '@/lib/product-availability';
import { currencyDecimalPlaces } from '@/lib/format';

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
}

export interface CatalogVariant {
  id: string;
  isInventoryTracked?: boolean | null;
  inventory?: VariantInventory | null;
}

/** PDP view of a product. Include expansions are read field by field. */
export interface CatalogProductDetail {
  id: string;
  name: string;
  slug: string;
  description?: string;
  productType?: string;
  isAvailable: boolean;
  isInventoryTracked?: boolean | null;
  metaDescription?: string;
  tags: string[];
  price?: number | null;
  compareAtPrice?: number | null;
  currency?: string;
  images?: { url: string; alt?: string | null }[];
  priceRange?: StorefrontProduct['priceRange'];
  categories: CatalogCategory[];
  variants: CatalogVariant[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fieldsOf(value: object): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    record[key] = Reflect.get(value, key);
  }
  return record;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Finite number, or an unscaled numeric string (inventory counts, numeric minor units). */
function readBound(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Price-range bound in minor units.
 * Numbers are already minor units. Decimal strings from core-api getPriceRanges
 * are major units ("15.00") and are scaled by the currency's decimal places.
 */
function readMoneyBound(value: unknown, currency: string): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const major = Number(trimmed);
  if (!Number.isFinite(major)) return undefined;
  return Math.round(major * 10 ** currencyDecimalPlaces(currency));
}

function readPrice(value: unknown): number | null | undefined {
  if (value === null) return null;
  const bound = readBound(value);
  return bound === undefined ? undefined : bound;
}

function readImages(
  value: unknown,
): { url: string; alt?: string | null }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const images: { url: string; alt?: string | null }[] = [];
  for (const image of value) {
    if (!isRecord(image)) continue;
    const url = readString(image.url);
    if (!url) continue;
    const alt =
      image.alt === null || typeof image.alt === 'string' ? image.alt : undefined;
    images.push(alt === undefined ? { url } : { url, alt });
  }
  return images.length > 0 ? images : undefined;
}

function readPriceRange(value: unknown): StorefrontProduct['priceRange'] {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  // The SDK requires currency; without it the bounds cannot be scaled.
  const currency = readString(value.currency);
  if (!currency) return undefined;
  const min = readMoneyBound(value.min, currency);
  const max = readMoneyBound(value.max, currency);
  if (min === undefined || max === undefined) return undefined;
  return { min, max, currency };
}

function readCategories(value: unknown): CatalogCategory[] {
  if (!Array.isArray(value)) return [];
  const categories: CatalogCategory[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const id = readString(item.id);
    const name = readString(item.name);
    const slug = readString(item.slug);
    if (!id || !name || !slug) continue;
    categories.push({ id, name, slug });
  }
  return categories;
}

function readInventory(value: unknown): VariantInventory | undefined {
  if (!isRecord(value)) return undefined;
  const status = value.status;
  if (
    status !== 'in_stock' &&
    status !== 'low_stock' &&
    status !== 'out_of_stock' &&
    status !== 'backorder'
  ) {
    return undefined;
  }
  const totalOnHand = readBound(value.totalOnHand);
  const totalAvailable = readBound(value.totalAvailable);
  const totalReserved = readBound(value.totalReserved);
  const totalIncoming = readBound(value.totalIncoming);
  const locationCount = readBound(value.locationCount);
  if (
    totalOnHand === undefined ||
    totalAvailable === undefined ||
    totalReserved === undefined ||
    totalIncoming === undefined ||
    locationCount === undefined
  ) {
    return undefined;
  }
  const summary: VariantInventory = {
    totalOnHand,
    totalAvailable,
    totalReserved,
    totalIncoming,
    status,
    locationCount,
    hasLowStockLocation: value.hasLowStockLocation === true,
  };
  return summary;
}

function readVariant(value: unknown): CatalogVariant | undefined {
  if (!isRecord(value)) return undefined;
  const id = readString(value.id);
  if (!id) return undefined;
  const tracked = value.isInventoryTracked;
  return {
    id,
    isInventoryTracked:
      typeof tracked === 'boolean' || tracked === null ? tracked : undefined,
    inventory: readInventory(value.inventory) ?? null,
  };
}

function productFromFields(
  fields: Record<string, unknown>,
  fallbackId: string,
): StorefrontProduct | null {
  const slug = readString(fields.slug);
  const name = readString(fields.name);
  if (!slug || !name) return null;
  const currency = readString(fields.currency);
  return {
    id: readString(fields.id) ?? fallbackId,
    slug,
    name,
    price: readPrice(fields.price),
    compareAtPrice: readPrice(fields.compareAtPrice),
    ...(currency ? { currency } : {}),
    images: readImages(fields.images),
    priceRange: readPriceRange(fields.priceRange),
  };
}

/** Catalog card fields, including include[] values the Product type omits. */
export function toStorefrontProduct(product: Product): StorefrontProduct {
  const fields = fieldsOf(product);
  const currency = readString(fields.currency);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: readPrice(fields.price),
    compareAtPrice: readPrice(fields.compareAtPrice),
    ...(currency ? { currency } : {}),
    images: readImages(fields.images),
    priceRange: readPriceRange(fields.priceRange),
  };
}

/** PDP fields. Typed Product columns are copied; include expansions are checked. */
export function toProductDetail(product: Product): CatalogProductDetail {
  const fields = fieldsOf(product);
  const variants: CatalogVariant[] = [];
  if (Array.isArray(fields.variants)) {
    for (const variant of fields.variants) {
      const mapped = readVariant(variant);
      if (mapped) variants.push(mapped);
    }
  }
  const currency = readString(fields.currency);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    productType: product.productType,
    isAvailable: product.isAvailable,
    isInventoryTracked: product.isInventoryTracked,
    metaDescription: product.metaDescription,
    tags: product.tags,
    price: readPrice(fields.price),
    compareAtPrice: readPrice(fields.compareAtPrice),
    ...(currency ? { currency } : {}),
    images: readImages(fields.images),
    priceRange: readPriceRange(fields.priceRange),
    categories: readCategories(fields.categories),
    variants,
  };
}

/** Search hits are `{ id, data }` documents. Older payloads put product fields on the hit itself. */
export function searchItemToProduct(item: SearchResultItem): StorefrontProduct | null {
  if (
    'slug' in item &&
    typeof item.slug === 'string' &&
    item.slug.length > 0 &&
    'name' in item &&
    typeof item.name === 'string' &&
    item.name.length > 0
  ) {
    const fields: Record<string, unknown> = { id: item.id };
    if ('price' in item) fields.price = item.price;
    if ('compareAtPrice' in item) fields.compareAtPrice = item.compareAtPrice;
    if ('currency' in item) fields.currency = item.currency;
    if ('images' in item) fields.images = item.images;
    if ('priceRange' in item) fields.priceRange = item.priceRange;
    fields.slug = item.slug;
    fields.name = item.name;
    return productFromFields(fields, item.id);
  }
  return productFromFields(item.data, item.id);
}
