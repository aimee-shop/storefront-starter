'use client';

import { useEffect, useRef, useState } from 'react';
import type { CheckoutShippingRate, EstimatedDelivery } from '@aimee.shop/sdk';
import { useCheckoutStore } from '@/stores/checkout-store';
import { formatMoney } from '@/lib/format';
import { FormAlert } from '@/components/account/FormAlert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** API may return `description` in addition to the typed EstimatedDelivery fields. */
function formatEstimatedDelivery(
  estimated: EstimatedDelivery & { description?: string }
): string {
  if (estimated.description) return estimated.description;
  if (estimated.dateRange) return estimated.dateRange;
  const min = estimated.minDays;
  const max = estimated.maxDays;
  if (min != null && max != null) {
    return `${min}-${max} business days`;
  }
  return '';
}

export function ShippingMethodForm() {
  const shippingRates = useCheckoutStore((s) => s.shippingRates);
  const isLoading = useCheckoutStore((s) => s.isLoading);
  const storeError = useCheckoutStore((s) => s.error);
  const session = useCheckoutStore((s) => s.session);
  const fetchShippingRates = useCheckoutStore((s) => s.fetchShippingRates);
  const selectShippingRate = useCheckoutStore((s) => s.selectShippingRate);
  const currency = session?.currency ?? 'USD';

  const [formError, setFormError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selecting, setSelecting] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    void fetchShippingRates().catch(() => {
      // Error surface via storeError
    });
  }, [fetchShippingRates]);

  const handleRetry = () => {
    setFormError(null);
    setSelectedId('');
    void fetchShippingRates().catch(() => {
      // storeError set by store
    });
  };

  const handleSelect = async (rateId: string) => {
    const rate = shippingRates?.find((r) => r.id === rateId);
    if (!rate || !rate.isAvailable) return;

    const previousId = selectedId;
    setSelectedId(rateId);
    setFormError(null);
    setSelecting(true);
    try {
      await selectShippingRate(rate);
    } catch {
      setSelectedId(previousId);
      setFormError('Could not select shipping method. Please try again.');
    } finally {
      setSelecting(false);
    }
  };

  const showInitialLoad = isLoading && shippingRates === null;
  const showRetryLoad = isLoading && shippingRates !== null && shippingRates.length === 0;

  if (showInitialLoad || showRetryLoad) {
    return <ShippingRatesSkeleton />;
  }

  if (storeError && (shippingRates === null || shippingRates.length === 0)) {
    return (
      <div className="space-y-4">
        <FormAlert message={storeError} />
        <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (shippingRates !== null && shippingRates.length === 0) {
    return (
      <div
        role="status"
        className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
      >
        <p>No shipping options are available for this address.</p>
        <p className="mt-1">Try a different address or contact support.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={handleRetry}
        >
          Refresh options
        </Button>
      </div>
    );
  }

  if (!shippingRates) {
    return <ShippingRatesSkeleton />;
  }

  return (
    <div className="space-y-4">
      <FormAlert message={formError} />

      <RadioGroup
        value={selectedId}
        onValueChange={(value) => {
          if (typeof value === 'string' && value) {
            void handleSelect(value);
          }
        }}
        disabled={selecting || isLoading}
        className="gap-3"
        aria-label="Shipping methods"
      >
        {shippingRates.map((rate) => (
          <ShippingRateOption
            key={rate.id}
            rate={rate}
            currency={currency}
            disabled={selecting || isLoading || !rate.isAvailable}
          />
        ))}
      </RadioGroup>

      {(selecting || isLoading) && selectedId && (
        <p className="text-sm text-muted-foreground" role="status">
          Updating shipping and totals...
        </p>
      )}
    </div>
  );
}

function ShippingRateOption({
  rate,
  currency,
  disabled,
}: {
  rate: CheckoutShippingRate;
  currency: string;
  disabled: boolean;
}) {
  const delivery = formatEstimatedDelivery(rate.estimatedDelivery);
  const unavailable = !rate.isAvailable;
  const radioId = `shipping-rate-${rate.id}`;

  return (
    <Label
      htmlFor={radioId}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal transition-colors',
        'has-[[data-slot=radio-group-item][data-checked]]:border-primary',
        'has-[[data-slot=radio-group-item][data-checked]]:bg-primary/5',
        unavailable && 'cursor-not-allowed opacity-60',
        disabled && !unavailable && 'cursor-wait'
      )}
    >
      <RadioGroupItem
        id={radioId}
        value={rate.id}
        disabled={disabled}
        className="mt-0.5"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{rate.name}</span>
          {rate.isRecommended && (
            <Badge variant="secondary">Recommended</Badge>
          )}
        </span>
        {(rate.carrier?.name || rate.carrier?.service) && (
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {[rate.carrier?.name, rate.carrier?.service]
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
        {delivery && (
          <span className="mt-0.5 block text-sm text-muted-foreground">
            Est. delivery: {delivery}
          </span>
        )}
        {unavailable && rate.unavailableReason && (
          <span className="mt-1 block text-sm text-destructive">
            {rate.unavailableReason}
          </span>
        )}
      </span>
      <span className="shrink-0 text-sm font-medium tabular-nums">
        {formatMoney(rate.cost, currency)}
      </span>
    </Label>
  );
}

function ShippingRatesSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading shipping options">
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
      <Skeleton className="h-20 w-full rounded-lg" />
    </div>
  );
}
