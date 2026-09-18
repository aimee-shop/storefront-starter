import { describe, expect, it } from 'vitest';
import { safeAccountReturnPath } from './account-return-path';
import {
  parseProductReviewsQuery,
  reviewComposerGate,
  reviewSignInHref,
  toProductReviewOptions,
} from './product-reviews';

describe('parseProductReviewsQuery', () => {
  it('defaults to newest, descending, page 1, limit 10', () => {
    expect(parseProductReviewsQuery()).toEqual({
      page: 1,
      limit: 10,
      sortBy: 'newest',
      sortOrder: 'desc',
    });
  });

  it('maps UI sort keys and ignores unknown sort', () => {
    expect(parseProductReviewsQuery({ sortBy: 'rating' }).sortBy).toBe('rating');
    expect(parseProductReviewsQuery({ sortBy: 'helpful' }).sortBy).toBe(
      'helpful',
    );
    expect(parseProductReviewsQuery({ sortBy: 'bestselling' }).sortBy).toBe(
      'newest',
    );
  });

  it('clamps page to an integer >= 1', () => {
    expect(parseProductReviewsQuery({ page: 0 }).page).toBe(1);
    expect(parseProductReviewsQuery({ page: -3 }).page).toBe(1);
    expect(parseProductReviewsQuery({ page: '2' }).page).toBe(2);
    expect(parseProductReviewsQuery({ page: 'nope' }).page).toBe(1);
  });

  it('builds SDK options without includeUnapproved', () => {
    const options = toProductReviewOptions(
      parseProductReviewsQuery({ sortBy: 'helpful', page: 3 }),
    );
    expect(options).toEqual({
      page: 3,
      limit: 10,
      sortBy: 'helpful',
      sortOrder: 'desc',
    });
    expect(options).not.toHaveProperty('includeUnapproved');
  });
});

describe('reviewComposerGate', () => {
  it('returns form mode when signed in', () => {
    expect(reviewComposerGate(true, 'classic-tee')).toEqual({ mode: 'form' });
  });

  it('returns a sign-in href with encoded product return path', () => {
    expect(reviewComposerGate(false, 'classic-tee')).toEqual({
      mode: 'sign-in',
      href: '/account?next=%2Fproducts%2Fclassic-tee',
    });
    expect(reviewSignInHref('classic-tee')).toBe(
      '/account?next=%2Fproducts%2Fclassic-tee',
    );
  });

  it('rejects unsafe return paths', () => {
    expect(safeAccountReturnPath('https://evil.example/phish')).toBeNull();
    expect(safeAccountReturnPath('//evil.example')).toBeNull();
    expect(safeAccountReturnPath('/account')).toBeNull();
    expect(safeAccountReturnPath('/products/classic-tee/edit')).toBeNull();
    expect(safeAccountReturnPath('/products/classic-tee?x=1')).toBeNull();
    expect(safeAccountReturnPath('/products/classic-tee')).toBe(
      '/products/classic-tee',
    );
    expect(safeAccountReturnPath('%2Fproducts%2Fclassic-tee')).toBe(
      '/products/classic-tee',
    );
  });
});
