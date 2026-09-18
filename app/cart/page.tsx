'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import type { CartItem } from '@aimee.shop/sdk';
import { useCartStore } from '@/stores/cart-store';
import { formatMoney } from '@/lib/format';
import { Button, buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export default function CartPage() {
  const cart = useCartStore((s) => s.cart);
  const cartId = useCartStore((s) => s.cartId);
  const hasHydrated = useCartStore((s) => s._hasHydrated);
  const updateItem = useCartStore((s) => s.updateItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const refreshCart = useCartStore((s) => s.refreshCart);
  const currency = cart?.currency ?? 'USD';

  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ itemId: string; message: string } | null>(
    null
  );
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Revalidate against the server once the persist layer has restored cartId.
  useEffect(() => {
    if (!hasHydrated || !cartId) return;
    let cancelled = false;
    void refreshCart()
      .then(() => {
        if (!cancelled) setRefreshError(null);
      })
      .catch(() => {
        // Keep the persisted snapshot (same idea as store onRehydrate offline).
        if (!cancelled) {
          setRefreshError('Could not refresh cart totals. Showing the last saved cart.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [hasHydrated, cartId, refreshCart]);

  const handleUpdateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      // Serialize mutations: store flips global isLoading; avoid overlapping rows.
      if (quantity < 1 || pendingItemId) return;
      setPendingItemId(itemId);
      setRowError(null);
      try {
        await updateItem(itemId, quantity);
      } catch (error) {
        // Double-click before re-render can hit the store lock; not a row failure.
        if (error instanceof Error && error.message === 'Cart mutation already in progress') {
          return;
        }
        console.error('Update cart item failed:', error);
        setRowError({ itemId, message: 'Could not update quantity. Please try again.' });
      } finally {
        setPendingItemId(null);
      }
    },
    [pendingItemId, updateItem]
  );

  const handleRemove = useCallback(
    async (itemId: string) => {
      if (pendingItemId) return;
      setPendingItemId(itemId);
      setRowError(null);
      try {
        await removeItem(itemId);
      } catch (error) {
        if (error instanceof Error && error.message === 'Cart mutation already in progress') {
          return;
        }
        console.error('Remove cart item failed:', error);
        setRowError({ itemId, message: 'Could not remove item. Please try again.' });
      } finally {
        setPendingItemId(null);
      }
    },
    [pendingItemId, removeItem]
  );

  if (!hasHydrated) {
    return <CartSkeleton />;
  }

  const items = cart?.items ?? [];
  const isEmpty = items.length === 0;

  return (
    <div className="py-10 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold tracking-tight">Your Cart</h1>

        {refreshError && (
          <p role="status" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {refreshError}
          </p>
        )}

        {isEmpty ? (
          <div className="mt-10 rounded-lg border border-dashed p-10 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link href="/products" className={cn('mt-6', buttonVariants())}>
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <section className="mt-8" aria-labelledby="cart-items-heading">
              <h2 id="cart-items-heading" className="sr-only">
                Cart items
              </h2>
              <ul className="divide-y rounded-lg border">
                {items.map((item) => (
                  <CartLineRow
                    key={item.id}
                    item={item}
                    currency={currency}
                    pending={pendingItemId === item.id}
                    actionsDisabled={pendingItemId !== null}
                    errorMessage={
                      rowError && rowError.itemId === item.id
                        ? rowError.message
                        : null
                    }
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemove}
                  />
                ))}
              </ul>
            </section>

            <section className="mt-8" aria-labelledby="cart-totals-heading">
              <h2 id="cart-totals-heading" className="text-lg font-semibold">
                Order summary
              </h2>
              <dl className="mt-4 space-y-2 rounded-lg border p-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatMoney(cart?.subtotal, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd>{formatMoney(cart?.shippingTotal, currency)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tax</dt>
                  <dd>{formatMoney(cart?.taxTotal, currency)}</dd>
                </div>
                {Number(cart?.discountTotal ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd>-{formatMoney(cart?.discountTotal, currency)}</dd>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <dt>Total</dt>
                  <dd>{formatMoney(cart?.total, currency)}</dd>
                </div>
              </dl>
            </section>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Link
                href="/products"
                className={cn(buttonVariants({ variant: 'outline' }), 'justify-center')}
              >
                Continue Shopping
              </Link>
              <Link
                href="/checkout"
                className={cn(buttonVariants({ size: 'lg' }), 'justify-center')}
              >
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}

        {/* Empty cart still shows a disabled checkout affordance for AC. */}
        {isEmpty && (
          <div className="mt-6 flex justify-center">
            <Button size="lg" disabled>
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function CartLineRow({
  item,
  currency,
  pending,
  actionsDisabled,
  errorMessage,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  currency: string;
  pending: boolean;
  actionsDisabled: boolean;
  errorMessage: string | null;
  onUpdateQuantity: (itemId: string, quantity: number) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
}) {
  const title = item.title || item.productName;
  const variantLabel = item.variantTitle || item.variantName;
  const atMin = item.quantity <= 1;
  const atMax =
    item.maxQuantity != null && item.maxQuantity > 0
      ? item.quantity >= item.maxQuantity
      : false;

  return (
    <li
      className={cn(
        'flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5',
        pending && 'opacity-70'
      )}
      aria-busy={pending}
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted sm:h-24 sm:w-24">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={title}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/60">
            <ImagePlaceholderIcon />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium leading-snug">{title}</p>
            {variantLabel && (
              <p className="mt-0.5 text-sm text-muted-foreground">{variantLabel}</p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {formatMoney(item.unitPrice, currency)} each
            </p>
          </div>
          <span className="shrink-0 font-medium">
            {formatMoney(item.subtotal, currency)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center rounded-lg border"
            role="group"
            aria-label={`Quantity for ${title}`}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-r-none"
              disabled={actionsDisabled || atMin}
              aria-label={`Decrease quantity of ${title}`}
              onClick={() => void onUpdateQuantity(item.id, item.quantity - 1)}
            >
              <Minus />
            </Button>
            <span
              className="min-w-8 px-1 text-center text-sm tabular-nums"
              aria-live="polite"
              aria-label={`Quantity ${item.quantity}`}
            >
              {item.quantity}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-l-none"
              disabled={actionsDisabled || atMax}
              aria-label={`Increase quantity of ${title}`}
              onClick={() => void onUpdateQuantity(item.id, item.quantity + 1)}
            >
              <Plus />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={actionsDisabled}
            aria-label={`Remove ${title} from cart`}
            onClick={() => void onRemove(item.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
            Remove
          </Button>
        </div>

        {errorMessage && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {errorMessage}
          </p>
        )}
      </div>
    </li>
  );
}

function CartSkeleton() {
  return (
    <div className="py-10 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-40" />
        <div className="mt-8 space-y-0 divide-y rounded-lg border">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4 p-4">
              <Skeleton className="h-20 w-20 shrink-0 rounded-md sm:h-24 sm:w-24" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-3 h-8 w-32" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="mt-8 h-40 w-full rounded-lg" />
      </div>
    </div>
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-8 w-8"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
      />
    </svg>
  );
}
