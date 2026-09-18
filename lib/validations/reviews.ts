import { z } from 'zod';

/**
 * Storefront review submit shape. Mirrors ReviewsValidatorService on core-api:
 * rating 1-5, title max 200, comment 10-5000 when present, at least one of
 * title or comment.
 */
export const productReviewSchema = z
  .object({
    productId: z.string().trim().min(1, 'Product is required'),
    rating: z.number().int().min(1, 'Select a rating').max(5, 'Select a rating'),
    title: z.string().trim().max(200, 'Title is too long').optional(),
    comment: z.string().trim().max(5000, 'Comment is too long').optional(),
  })
  .refine((value) => Boolean(value.title) || Boolean(value.comment), {
    message: 'Add a title or a comment',
    path: ['comment'],
  })
  .refine((value) => !value.comment || value.comment.length >= 10, {
    message: 'Comment must be at least 10 characters',
    path: ['comment'],
  });

export type ProductReviewValues = z.input<typeof productReviewSchema>;
