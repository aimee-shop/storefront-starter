'use server';

import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from '@aimee.shop/sdk';
import { sdk } from '@/lib/sdk';
import { getCustomerSessionWithToken } from '@/lib/customer-session';
import { loadProductReviews } from '@/lib/load-product-reviews';
import {
  parseProductReviewsQuery,
  type ProductReviewsPayload,
} from '@/lib/product-reviews';
import { MARKETING_GENERIC_ERROR, zodFieldErrors } from '@/lib/marketing-form';
import { productReviewSchema } from '@/lib/validations/reviews';

export async function loadProductReviewsAction(
  productId: string,
  input: { sortBy?: string; page?: number } = {},
): Promise<ProductReviewsPayload | null> {
  if (!productId) return null;
  return loadProductReviews(productId, parseProductReviewsQuery(input));
}

export async function getReviewSessionAction(): Promise<{ signedIn: boolean }> {
  const session = await getCustomerSessionWithToken();
  return { signedIn: session !== null };
}

export type SubmitProductReviewResult =
  | { ok: true; status: 'pending' | 'approved' }
  | {
      ok: false;
      formError?: string;
      fieldErrors?: Record<string, string>;
      unauthenticated?: boolean;
    };

export async function submitProductReviewAction(input: {
  productId: string;
  rating: number;
  title?: string;
  comment?: string;
}): Promise<SubmitProductReviewResult> {
  const parsed = productReviewSchema.safeParse({
    productId: input.productId,
    rating: input.rating,
    title: input.title?.trim() ? input.title : undefined,
    comment: input.comment?.trim() ? input.comment : undefined,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  const session = await getCustomerSessionWithToken();
  if (!session) {
    return {
      ok: false,
      formError: 'Please sign in to write a review.',
      unauthenticated: true,
    };
  }

  try {
    const review = await sdk.storefront.withCustomer(session.accessToken).reviews.create({
      productId: parsed.data.productId,
      rating: parsed.data.rating,
      title: parsed.data.title || undefined,
      comment: parsed.data.comment || undefined,
    });
    return {
      ok: true,
      status: review.status === 'approved' ? 'approved' : 'pending',
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return {
        ok: false,
        formError: 'Please sign in to write a review.',
        unauthenticated: true,
      };
    }
    if (error instanceof AuthorizationError) {
      return {
        ok: false,
        formError: 'You have already reviewed this product.',
      };
    }
    if (error instanceof ValidationError) {
      return {
        ok: false,
        formError: 'Please check your review and try again.',
      };
    }
    return { ok: false, formError: MARKETING_GENERIC_ERROR };
  }
}
