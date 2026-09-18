'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import type { Review } from '@aimee.shop/sdk';
import {
  getReviewSessionAction,
  loadProductReviewsAction,
  submitProductReviewAction,
} from '@/app/products/[slug]/review-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDate } from '@/lib/format';
import {
  REVIEW_SORT_OPTIONS,
  reviewComposerGate,
  reviewSignInHref,
  type ProductReviewsPayload,
  type ReviewSortValue,
} from '@/lib/product-reviews';
import { cn } from '@/lib/utils';

interface ProductReviewsProps {
  productId: string;
  productSlug: string;
  initial: ProductReviewsPayload;
}

export function ProductReviews({
  productId,
  productSlug,
  initial,
}: ProductReviewsProps) {
  const [payload, setPayload] = useState(initial);
  const [sortBy, setSortBy] = useState<ReviewSortValue>('newest');
  const [page, setPage] = useState(initial.list.page);
  const [loadingList, setLoadingList] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getReviewSessionAction()
      .then((result) => {
        if (!cancelled) setSignedIn(result.signedIn);
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function refetch(nextSort: ReviewSortValue, nextPage: number) {
    setLoadingList(true);
    try {
      const next = await loadProductReviewsAction(productId, {
        sortBy: nextSort,
        page: nextPage,
      });
      if (next) {
        setPayload(next);
        setPage(next.list.page);
      }
    } finally {
      setLoadingList(false);
    }
  }

  function handleSortChange(value: string) {
    const nextSort = isReviewSortValue(value) ? value : 'newest';
    setSortBy(nextSort);
    setPage(1);
    void refetch(nextSort, 1);
  }

  const { list, aggregates } = payload;
  const totalPages = Math.max(1, Math.ceil(list.total / (list.limit || 1)));
  const average = Number.parseFloat(aggregates.averageRating);
  const averageStars = Number.isFinite(average) ? average : 0;
  const sortLabel =
    REVIEW_SORT_OPTIONS.find((option) => option.value === sortBy)?.label ??
    'Newest';
  const composer = reviewComposerGate(signedIn, productSlug);

  return (
    <div className="max-w-3xl">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-3xl font-semibold tracking-tight">
            {aggregates.averageRating}
          </p>
          <StarRow value={averageStars} />
          <p className="mt-1 text-sm text-muted-foreground">
            {aggregates.totalReviews}{' '}
            {list.total === 1 ? 'review' : 'reviews'}
            {list.total > 0 && aggregates.recommendationRate
              ? `. ${aggregates.recommendationRate} recommend this product`
              : ''}
          </p>
        </div>
        <RatingBreakdown breakdown={aggregates.ratingBreakdown} />
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Customer reviews</h2>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'gap-1.5',
            )}
            disabled={loadingList}
          >
            {sortLabel}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={handleSortChange}
            >
              {REVIEW_SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={cn('mt-4 space-y-4', loadingList && 'opacity-60')}>
        {list.reviews.length === 0 ? (
          <p className="text-muted-foreground">No reviews yet.</p>
        ) : (
          list.reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <nav
          className="mt-6 flex items-center justify-center gap-2"
          aria-label="Review pagination"
        >
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || loadingList}
            onClick={() => {
              const nextPage = page - 1;
              setPage(nextPage);
              void refetch(sortBy, nextPage);
            }}
          >
            Previous
          </Button>
          <span className="px-3 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loadingList}
            onClick={() => {
              const nextPage = page + 1;
              setPage(nextPage);
              void refetch(sortBy, nextPage);
            }}
          >
            Next
          </Button>
        </nav>
      )}

      <div className="mt-10 border-t pt-8">
        <h2 className="text-sm font-medium">Write a review</h2>
        {submitMessage ? (
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            {submitMessage}
          </p>
        ) : composer.mode === 'sign-in' ? (
          <p className="mt-3 text-sm text-muted-foreground">
            <Link
              href={composer.href}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>{' '}
            to write a review.
          </p>
        ) : (
          <ReviewForm
            productId={productId}
            productSlug={productSlug}
            onUnauthenticated={() => setSignedIn(false)}
            onSubmitted={async (status) => {
              if (status === 'pending') {
                setSubmitMessage(
                  'Thanks -- it will show once approved.',
                );
                return;
              }
              setSubmitMessage('Thanks -- your review is published.');
              await refetch(sortBy, 1);
            }}
          />
        )}
      </div>
    </div>
  );
}

function ReviewForm({
  productId,
  productSlug,
  onUnauthenticated,
  onSubmitted,
}: {
  productId: string;
  productSlug: string;
  onUnauthenticated: () => void;
  onSubmitted: (status: 'pending' | 'approved') => Promise<void>;
}) {
  const [rating, setRating] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const signInHref = reviewSignInHref(productSlug);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const result = await submitProductReviewAction({
        productId,
        rating,
        title: String(formData.get('title') ?? ''),
        comment: String(formData.get('comment') ?? ''),
      });

      if (result.ok) {
        form.reset();
        setRating(0);
        await onSubmitted(result.status);
        return;
      }

      if (result.unauthenticated) {
        onUnauthenticated();
        return;
      }

      setErrorMessage(
        result.formError ??
          Object.values(result.fieldErrors ?? {})[0] ??
          'Something went wrong. Please try again.',
      );
    } catch {
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
      <div className="space-y-2">
        <Label id="review-rating-label">Rating</Label>
        <div
          role="radiogroup"
          aria-labelledby="review-rating-label"
          className="flex gap-1"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value === 1 ? '' : 's'}`}
              className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setRating(value)}
            >
              <Star
                className={cn(
                  'h-6 w-6',
                  value <= rating && 'fill-current text-foreground',
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-title">Title</Label>
        <Input
          id="review-title"
          name="title"
          maxLength={200}
          placeholder="Summarize your experience"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-comment">Comment</Label>
        <textarea
          id="review-comment"
          name="comment"
          rows={5}
          maxLength={5000}
          placeholder="What did you like or dislike?"
          disabled={loading}
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}{' '}
          {errorMessage.startsWith('Please sign in') ? (
            <Link
              href={signInHref}
              className="font-medium underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          ) : null}
        </p>
      )}

      <Button type="submit" disabled={loading || rating < 1}>
        {loading ? 'Submitting...' : 'Submit review'}
      </Button>
    </form>
  );
}

function ReviewItem({ review }: { review: Review }) {
  return (
    <article className="rounded-lg border p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <StarRow value={review.rating} />
        {review.isVerifiedPurchase && (
          <Badge variant="secondary">Verified purchase</Badge>
        )}
      </div>
      {review.title && (
        <h3 className="mt-2 font-medium">{review.title}</h3>
      )}
      {review.comment && (
        <p className="mt-2 leading-relaxed text-muted-foreground">
          {review.comment}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        {review.reviewerName?.trim() || 'Customer'} on{' '}
        {formatDate(review.createdAt)}
      </p>
      {review.merchantReply && (
        <div className="mt-4 rounded-md bg-muted/50 px-3 py-3">
          <p className="text-xs font-medium">Store reply</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {review.merchantReply}
          </p>
          {review.merchantRepliedAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              {formatDate(review.merchantRepliedAt)}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function StarRow({ value }: { value: number }) {
  const filled = Math.round(value);
  return (
    <div className="mt-1 flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'h-4 w-4',
            star <= filled
              ? 'fill-current text-foreground'
              : 'text-muted-foreground/40',
          )}
        />
      ))}
    </div>
  );
}

function RatingBreakdown({
  breakdown,
}: {
  breakdown: ProductReviewsPayload['aggregates']['ratingBreakdown'];
}) {
  return (
    <div className="w-full max-w-xs space-y-1.5">
      {breakdown.map((row) => (
        <div key={row.stars} className="flex items-center gap-2 text-xs">
          <span className="w-8 shrink-0 text-muted-foreground">
            {row.stars} star
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground/70"
              style={{ width: `${row.percentage}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-muted-foreground">
            {row.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function isReviewSortValue(value: string): value is ReviewSortValue {
  return value === 'newest' || value === 'rating' || value === 'helpful';
}
