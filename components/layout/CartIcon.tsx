'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/stores/cart-store';

export function CartIcon() {
  // Gated on hydration so SSR markup and the first client render agree
  const itemCount = useCartStore((s) => (s._hasHydrated ? (s.cart?.items?.length ?? 0) : 0));

  return (
    <Link
      href="/cart"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted"
    >
      <ShoppingBag className="h-5 w-5" />
      {itemCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full p-0 text-[10px]"
        >
          {itemCount}
        </Badge>
      )}
      <span className="sr-only">Cart ({itemCount} items)</span>
    </Link>
  );
}
