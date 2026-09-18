'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CustomerAddress } from '@aimee.shop/sdk';
import { AddressCard } from '@/components/account/AddressCard';
import { AddressForm } from '@/components/account/AddressForm';
import {
  ADDRESS_TYPES,
  ADDRESS_TYPE_LABELS,
  type AddressTypeValue,
} from '@/lib/validations/address';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function groupByType(
  addresses: CustomerAddress[]
): { type: AddressTypeValue; items: CustomerAddress[] }[] {
  const buckets = new Map<AddressTypeValue, CustomerAddress[]>();
  for (const type of ADDRESS_TYPES) {
    buckets.set(type, []);
  }
  for (const address of addresses) {
    const type = (ADDRESS_TYPES as readonly string[]).includes(address.type)
      ? (address.type as AddressTypeValue)
      : 'other';
    buckets.get(type)!.push(address);
  }
  return ADDRESS_TYPES.map((type) => ({
    type,
    items: buckets.get(type) ?? [],
  })).filter((group) => group.items.length > 0);
}

export function AddressBook({ addresses }: { addresses: CustomerAddress[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const groups = groupByType(addresses);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (address: CustomerAddress) => {
    setEditing(address);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const onSuccess = () => {
    closeDialog();
    router.refresh();
  };

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {addresses.length === 0
            ? 'No saved addresses yet.'
            : `${addresses.length} saved address${addresses.length === 1 ? '' : 'es'}.`}
        </p>
        <Button type="button" onClick={openCreate}>
          Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground">
            Save shipping and billing addresses for faster checkout.
          </p>
          <Button type="button" className="mt-6" onClick={openCreate}>
            Add your first address
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group.type} aria-labelledby={`address-type-${group.type}`}>
              <h2
                id={`address-type-${group.type}`}
                className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase"
              >
                {ADDRESS_TYPE_LABELS[group.type]}
              </h2>
              <ul className="space-y-3">
                {group.items.map((address) => (
                  <li key={address.id}>
                    <AddressCard
                      address={address}
                      onEdit={openEdit}
                      onMutated={() => router.refresh()}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
          else setDialogOpen(true);
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit address' : 'Add address'}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update this address in your address book.'
                : 'Add a new address to your address book.'}
            </DialogDescription>
          </DialogHeader>
          <AddressForm
            key={editing?.id ?? 'new'}
            address={editing}
            onSuccess={onSuccess}
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
