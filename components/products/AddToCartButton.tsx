'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart-store';

type Status = 'idle' | 'loading' | 'added' | 'error';

interface AddToCartButtonProps {
  productId: string;
  productVariantId: string;
  disabled?: boolean;
}

export function AddToCartButton({ productId, productVariantId, disabled }: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [status, setStatus] = useState<Status>('idle');

  async function handleAddToCart() {
    setStatus('loading');
    try {
      await addItem(productId, productVariantId, 1);
      setStatus('added');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('Add to cart failed:', error);
      setStatus('error');
    }
  }

  const label = disabled
    ? 'Out of Stock'
    : status === 'loading'
      ? 'Adding...'
      : status === 'added'
        ? 'Added to Cart'
        : 'Add to Cart';

  return (
    <div>
      <Button
        size="lg"
        className="w-full"
        onClick={handleAddToCart}
        disabled={disabled || status === 'loading'}
      >
        {label}
      </Button>
      {status === 'error' && (
        <p className="mt-2 text-sm text-destructive">
          Could not add to cart. Please try again.
        </p>
      )}
    </div>
  );
}
