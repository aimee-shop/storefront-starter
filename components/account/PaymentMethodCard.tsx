'use client';

import { useState, useTransition } from 'react';
import {
  removePaymentMethodAction,
  setDefaultPaymentMethodAction,
} from '@/app/account/payment-methods/actions';
import type { SavedPaymentMethod } from '@/app/account/payment-methods/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/** "visa" -> "Visa"; non-card types fall back to a capitalized type label. */
export function paymentMethodLabel(pm: SavedPaymentMethod): string {
  const brand = pm.cardBrand ?? pm.type;
  const name =
    brand.charAt(0).toUpperCase() + brand.slice(1).replace(/_/g, ' ');
  return pm.cardLastFour ? `${name} **** ${pm.cardLastFour}` : name;
}

export function paymentMethodExpiryLabel(
  pm: SavedPaymentMethod
): string | null {
  if (pm.cardExpMonth == null || pm.cardExpYear == null) return null;
  return `Expires ${String(pm.cardExpMonth).padStart(2, '0')}/${pm.cardExpYear}`;
}

export function PaymentMethodCard({
  paymentMethod,
  onMutated,
}: {
  paymentMethod: SavedPaymentMethod;
  onMutated: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const expiry = paymentMethodExpiryLabel(paymentMethod);
  const showSetDefault = !paymentMethod.isDefault;

  const onRemove = () => {
    // MVP confirm: AlertDialog not installed; matches address delete pattern.
    if (
      !window.confirm(
        'Remove this payment method? This cannot be undone.'
      )
    ) {
      return;
    }
    setActionError(null);
    startTransition(async () => {
      const result = await removePaymentMethodAction(paymentMethod.id);
      if (!result.ok) {
        setActionError(
          result.formError ?? 'Could not remove payment method.'
        );
        return;
      }
      onMutated();
    });
  };

  const onSetDefault = () => {
    if (paymentMethod.isDefault) return;
    setActionError(null);
    startTransition(async () => {
      const result = await setDefaultPaymentMethodAction(paymentMethod.id);
      if (!result.ok) {
        setActionError(
          result.formError ?? 'Could not set default payment method.'
        );
        return;
      }
      onMutated();
    });
  };

  return (
    <div className="rounded-lg border p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{paymentMethodLabel(paymentMethod)}</p>
            {paymentMethod.isDefault && (
              <Badge variant="secondary">Default</Badge>
            )}
          </div>
          {expiry && (
            <p className="text-sm text-muted-foreground">{expiry}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {showSetDefault && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-8"
              disabled={isPending}
              onClick={onSetDefault}
            >
              Set as default
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-0"
            disabled={isPending}
            onClick={onRemove}
          >
            Remove
          </Button>
        </div>
      </div>
      {actionError && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      )}
    </div>
  );
}
