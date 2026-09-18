'use client';

import { useEffect } from 'react';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StorefrontMarketOption } from '@/lib/market-types';
import { useMarketPreferenceStore } from '@/stores/market-preference-store';
import { useCartStore } from '@/stores/cart-store';

interface RegionPickerProps {
  markets: StorefrontMarketOption[];
  /** Compact icon-only trigger for tight header rows on small screens. */
  compact?: boolean;
  className?: string;
}

/**
 * Region/market picker. Persists marketId; changing region clears the cart
 * because marketId is immutable after carts.create (API MARKET_IMMUTABLE).
 * Hidden when fewer than two markets are enabled for the store.
 */
export function RegionPicker({
  markets,
  compact = false,
  className,
}: RegionPickerProps) {
  const marketId = useMarketPreferenceStore((s) => s.marketId);
  const hasHydrated = useMarketPreferenceStore((s) => s._hasHydrated);
  const setMarketId = useMarketPreferenceStore((s) => s.setMarketId);
  const seedDerivedCountryCode = useMarketPreferenceStore(
    (s) => s.seedDerivedCountryCode
  );
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    if (hasHydrated) seedDerivedCountryCode();
  }, [hasHydrated, seedDerivedCountryCode]);

  if (markets.length < 2) return null;

  const selected =
    hasHydrated ? (markets.find((m) => m.id === marketId) ?? null) : null;
  // Gate on hydration so SSR and the first client paint both show "Region"
  // and avoid a text mismatch once localStorage rehydrates marketId.
  const currentLabel = selected
    ? `${selected.name}${selected.defaultCurrency ? ` (${selected.defaultCurrency})` : ''}`
    : 'Region';

  function handleChange(value: string) {
    if (value === marketId) return;
    setMarketId(value);
    // New market requires a new cart (market is immutable on the cart resource).
    clearCart();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'gap-1.5',
          compact && 'h-9 w-9 px-0',
          className
        )}
        aria-label="Select shopping region"
      >
        <Globe className="h-4 w-4 shrink-0" aria-hidden />
        {!compact && (
          <span className="max-w-[9rem] truncate">{currentLabel}</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuRadioGroup
          value={hasHydrated ? (marketId ?? '') : ''}
          onValueChange={handleChange}
        >
          {markets.map((market) => (
            <DropdownMenuRadioItem key={market.id} value={market.id}>
              <span className="flex w-full items-center justify-between gap-2">
                <span>{market.name}</span>
                <span className="text-xs text-muted-foreground">
                  {market.defaultCurrency}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Inline radio list for MobileNav sheet (no dropdown).
 */
export function RegionPickerList({
  markets,
  onSelected,
}: {
  markets: StorefrontMarketOption[];
  onSelected?: () => void;
}) {
  const marketId = useMarketPreferenceStore((s) => s.marketId);
  const hasHydrated = useMarketPreferenceStore((s) => s._hasHydrated);
  const setMarketId = useMarketPreferenceStore((s) => s.setMarketId);
  const clearCart = useCartStore((s) => s.clearCart);

  if (markets.length < 2) return null;

  return (
    <div className="px-3 py-2" role="group" aria-label="Shopping region">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Region
      </p>
      <ul className="space-y-1">
        {markets.map((market) => {
          const selected = hasHydrated && market.id === marketId;
          return (
            <li key={market.id}>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition-colors',
                  selected
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
                aria-pressed={selected}
                onClick={() => {
                  if (market.id !== marketId) {
                    setMarketId(market.id);
                    clearCart();
                  }
                  onSelected?.();
                }}
              >
                <span>{market.name}</span>
                <span className="text-xs text-muted-foreground">
                  {market.defaultCurrency}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
