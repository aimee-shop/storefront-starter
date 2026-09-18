import type {
  ProductReviewOptions,
  ProductReviewSortBy,
  ProductReviewSortOrder,
  ReviewAggregates,
  ReviewListResponse,
} from '@aimee.shop/sdk';
import { safeAccountReturnPath } from './account-return-path';

export const REVIEW_PAGE_SIZE = 10;

export const REVIEW_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Highest rating' },
  { value: 'helpful', label: 'Most helpful' },
] as const;

export type ReviewSortValue = (typeof REVIEW_SORT_OPTIONS)[number]['value'];

export interface ProductReviewsQuery {
  page: number;
  limit: number;
  sortBy: ProductReviewSortBy;
  sortOrder: ProductReviewSortOrder;
}

export interface ProductReviewsPayload {
  list: ReviewListResponse;
  aggregates: ReviewAggregates;
}

export type ReviewComposerMode =
  | { mode: 'form' }
  | { mode: 'sign-in'; href: string };

export function parseProductReviewsQuery(input: {
  sortBy?: string | null;
  page?: number | string | null;
  limit?: number | string | null;
} = {}): ProductReviewsQuery {
  return {
    page: clampPage(input.page),
    limit: clampLimit(input.limit),
    sortBy: isReviewSortValue(input.sortBy) ? input.sortBy : 'newest',
    sortOrder: 'desc',
  };
}

export function toProductReviewOptions(
  query: ProductReviewsQuery,
): ProductReviewOptions {
  return {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };
}

export function reviewSignInHref(productSlug: string): string {
  const path = `/products/${productSlug}`;
  const next = safeAccountReturnPath(path);
  if (!next) return '/account';
  return `/account?next=${encodeURIComponent(next)}`;
}

export function reviewComposerGate(
  signedIn: boolean,
  productSlug: string,
): ReviewComposerMode {
  if (signedIn) return { mode: 'form' };
  return { mode: 'sign-in', href: reviewSignInHref(productSlug) };
}

function isReviewSortValue(
  value: string | null | undefined,
): value is ReviewSortValue {
  return value === 'newest' || value === 'rating' || value === 'helpful';
}

function clampPage(value: number | string | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function clampLimit(value: number | string | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return REVIEW_PAGE_SIZE;
  return Math.min(100, Math.floor(parsed));
}
