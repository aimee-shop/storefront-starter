import 'server-only';

import { AuthorizationError } from '@aimee.shop/sdk';
import { sdk } from './sdk';
import {
  parseProductReviewsQuery,
  toProductReviewOptions,
  type ProductReviewsPayload,
  type ProductReviewsQuery,
} from './product-reviews';

/**
 * Public PDP reviews fetch. Fail closed: flag-off / 403 / outage returns
 * null so the Reviews tab is omitted instead of erroring the product page.
 */
export async function loadProductReviews(
  productId: string,
  query: ProductReviewsQuery = parseProductReviewsQuery(),
): Promise<ProductReviewsPayload | null> {
  try {
    const options = toProductReviewOptions(query);
    const [list, aggregates] = await Promise.all([
      sdk.reviews.getByProduct(productId, options),
      sdk.reviews.getAggregates(productId),
    ]);
    return { list, aggregates };
  } catch (error) {
    if (!(error instanceof AuthorizationError)) {
      console.error('[storefront] product reviews lookup failed', error);
    }
    return null;
  }
}
