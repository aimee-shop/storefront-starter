'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  attachPaymentMethodAction,
  createSetupIntentAction,
} from '@/app/account/payment-methods/actions';
import type { ConfirmSetupFn } from '@/components/account/AddCardPaymentForm';
import { FormAlert } from '@/components/account/FormAlert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { VaultSetupIntent } from '@/lib/setup-intent';

const AddCardPaymentForm = dynamic(
  () =>
    import('@/components/account/AddCardPaymentForm').then(
      (m) => m.AddCardPaymentForm
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-12 w-full" />,
  }
);

export function AddCardDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [intent, setIntent] = useState<VaultSetupIntent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const confirmRef = useRef<ConfirmSetupFn | null>(null);
  const loadStarted = useRef(false);

  const clearForm = useCallback(() => {
    setIntent(null);
    setLoadError(null);
    setSaveError(null);
    confirmRef.current = null;
  }, []);

  const loadIntent = useCallback(async () => {
    confirmRef.current = null;
    const result = await createSetupIntentAction();
    if (!result.ok) {
      setIntent(null);
      setLoadError(result.formError ?? 'Could not start card setup.');
      return;
    }
    setLoadError(null);
    setSaveError(null);
    setIntent({
      clientSecret: result.clientSecret,
      setupIntentId: result.setupIntentId,
      publishableKey: result.publishableKey,
      status: result.status,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      loadStarted.current = false;
      return;
    }
    if (loadStarted.current) return;
    loadStarted.current = true;
    void loadIntent();
  }, [open, loadIntent]);

  const handleReady = useCallback((confirm: ConfirmSetupFn) => {
    confirmRef.current = confirm;
  }, []);

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen && saving) return;
    if (!nextOpen) clearForm();
    onOpenChange(nextOpen);
  };

  const handleSave = async () => {
    if (!intent) {
      setSaveError('Card setup is not ready. Please try again.');
      return;
    }
    if (!confirmRef.current) {
      setSaveError('Card form is still loading. Wait a moment and try again.');
      return;
    }

    setSaveError(null);
    setSaving(true);
    try {
      const confirmed = await confirmRef.current(intent.clientSecret);
      if (!confirmed.success) {
        const message = confirmed.error || 'Could not save this card.';
        await loadIntent();
        setSaveError(message);
        return;
      }

      const attached = await attachPaymentMethodAction(confirmed.setupIntentId);
      if (!attached.ok) {
        const message = attached.formError ?? 'Could not save this card.';
        await loadIntent();
        setSaveError(message);
        return;
      }

      onSaved();
      clearForm();
      onOpenChange(false);
    } catch {
      try {
        await loadIntent();
      } catch {
        // Keep the generic save error even if the replacement SetupIntent fails.
      }
      setSaveError('Could not save this card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle>Add card</DialogTitle>
          <DialogDescription>
            Save a card for faster checkout. Card details go to the payment
            provider, not this store.
          </DialogDescription>
        </DialogHeader>

        {loadError ? (
          <div className="space-y-4">
            <FormAlert message={loadError} />
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setLoadError(null);
                void loadIntent();
              }}
            >
              Try again
            </Button>
          </div>
        ) : !intent ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <div className="space-y-4">
            <AddCardPaymentForm
              key={intent.setupIntentId}
              publishableKey={intent.publishableKey}
              onReady={handleReady}
              disabled={saving}
            />
            {saveError && <FormAlert message={saveError} />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="min-h-11 sm:min-h-8"
                disabled={saving}
                onClick={() => {
                  void handleSave();
                }}
              >
                {saving ? 'Saving...' : 'Save card'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
