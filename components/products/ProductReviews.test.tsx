import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ProductReviewsPayload } from '@/lib/product-reviews';

vi.mock('@/app/products/[slug]/review-actions', () => ({
  getReviewSessionAction: vi.fn(async () => ({ signedIn: false })),
  loadProductReviewsAction: vi.fn(),
  submitProductReviewAction: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

import { ProductReviews } from './ProductReviews';
import { getReviewSessionAction } from '@/app/products/[slug]/review-actions';

const emptyPayload: ProductReviewsPayload = {
  list: { reviews: [], total: 0, page: 1, limit: 10 },
  aggregates: {
    averageRating: '0.0',
    totalReviews: '0',
    recommendationRate: '0%',
    trustScore: 0,
    ratingBreakdown: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: 0,
      percentage: 0,
    })),
  },
};

describe('ProductReviews', () => {
  it('shows the empty list and a sign-in return link for guests', async () => {
    render(
      <ProductReviews
        productId="prod-1"
        productSlug="classic-tee"
        initial={emptyPayload}
      />,
    );

    expect(screen.getByText('No reviews yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/account?next=%2Fproducts%2Fclassic-tee',
    );
    expect(screen.queryByRole('button', { name: 'Submit review' })).toBeNull();
  });

  it('shows the submit form when the session probe reports signed in', async () => {
    vi.mocked(getReviewSessionAction).mockResolvedValueOnce({ signedIn: true });

    render(
      <ProductReviews
        productId="prod-1"
        productSlug="classic-tee"
        initial={emptyPayload}
      />,
    );

    expect(
      await screen.findByRole('button', { name: 'Submit review' }),
    ).toBeInTheDocument();
  });
});
