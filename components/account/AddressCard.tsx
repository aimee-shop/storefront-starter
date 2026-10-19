'use client';

import { useState, useTransition } from 'react';
import type { StorefrontAddress } from '@aimee.shop/sdk';
import {
  deleteAddressAction,
  setDefaultAddressAction,
} from '@/app/account/addresses/actions';
import { canSetDefault, isDefaultForType } from '@/lib/address-book';
import {
  ADDRESS_TYPE_LABELS,
  isAddressType,
} from '@/lib/validations/address';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function formatCityLine(address: StorefrontAddress): string {
  const locality = [address.city, address.state].filter(Boolean).join(', ');
  if (locality && address.zip) return `${locality} ${address.zip}`;
  return locality || address.zip || '';
}

export function AddressCard({
  address,
  onEdit,
  onMutated,
}: {
  address: StorefrontAddress;
  onEdit: (address: StorefrontAddress) => void;
  onMutated: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const isDefault = isDefaultForType(address);
  const showSetDefault = canSetDefault(address) && !isDefault;
  const typeLabel = isAddressType(address.type)
    ? ADDRESS_TYPE_LABELS[address.type]
    : address.type;

  const onDelete = () => {
    // MVP confirm: AlertDialog not installed; issue allows window.confirm.
    if (!window.confirm('Delete this address? This cannot be undone.')) {
      return;
    }
    setActionError(null);
    startTransition(async () => {
      const result = await deleteAddressAction(address.id);
      if (!result.ok) {
        setActionError(result.formError ?? 'Could not delete address.');
        return;
      }
      onMutated();
    });
  };

  const onSetDefault = () => {
    if (!canSetDefault(address)) return;
    setActionError(null);
    startTransition(async () => {
      const result = await setDefaultAddressAction(address.id, address.type);
      if (!result.ok) {
        setActionError(result.formError ?? 'Could not set default address.');
        return;
      }
      onMutated();
    });
  };

  const name = [address.firstName, address.lastName].filter(Boolean).join(' ');
  const cityLine = formatCityLine(address);

  return (
    <div className="rounded-lg border p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              {typeLabel}
            </span>
            {address.label && (
              <span className="text-sm text-muted-foreground">
                &middot; {address.label}
              </span>
            )}
            {isDefault && <Badge variant="secondary">Default</Badge>}
          </div>
          <address className="not-italic text-sm leading-relaxed">
            {name && <p className="font-medium">{name}</p>}
            <p>{address.address1}</p>
            {address.address2 && <p>{address.address2}</p>}
            {cityLine && <p>{cityLine}</p>}
            <p>{address.country}</p>
            {address.phone && (
              <p className="mt-1 text-muted-foreground">{address.phone}</p>
            )}
          </address>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 min-w-11 sm:min-h-8 sm:min-w-0"
            disabled={isPending}
            onClick={() => onEdit(address)}
          >
            Edit
          </Button>
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
            onClick={onDelete}
          >
            Delete
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
