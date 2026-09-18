'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SavedPaymentMethod } from '@/app/account/payment-methods/types';
import { AddCardDialog } from '@/components/account/AddCardDialog';
import { PaymentMethodCard } from '@/components/account/PaymentMethodCard';
import { Button } from '@/components/ui/button';

export function PaymentMethodList({
  paymentMethods,
}: {
  paymentMethods: SavedPaymentMethod[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  const openAdd = () => setAddOpen(true);

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {paymentMethods.length === 0
            ? 'No saved payment methods yet.'
            : `${paymentMethods.length} saved payment method${paymentMethods.length === 1 ? '' : 's'}.`}
        </p>
        <Button type="button" onClick={openAdd}>
          Add card
        </Button>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground">
            Save a card for faster checkout. Cards you add here or during
            checkout will appear in this list.
          </p>
          <Button type="button" className="mt-6" onClick={openAdd}>
            Add your first card
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {paymentMethods.map((pm) => (
            <li key={pm.id}>
              <PaymentMethodCard
                paymentMethod={pm}
                onMutated={() => router.refresh()}
              />
            </li>
          ))}
        </ul>
      )}

      <AddCardDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
