'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CheckoutAddress, CustomerAddress } from '@aimee.shop/sdk';
import {
  shippingAddressSchema,
  type ShippingAddressValues,
} from '@/lib/validations/checkout';
import { useCheckoutStore } from '@/stores/checkout-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FormAlert } from '@/components/account/FormAlert';
import { cn } from '@/lib/utils';

function defaultsFromSession(
  address: CheckoutAddress | undefined,
  customerEmail?: string | null
): ShippingAddressValues {
  return {
    email: address?.email ?? customerEmail ?? '',
    firstName: address?.firstName ?? '',
    lastName: address?.lastName ?? '',
    address1: address?.address1 ?? '',
    address2: address?.address2 ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    zip: address?.zip ?? '',
    country: address?.country ?? '',
    phone: address?.phone ?? '',
  };
}

function valuesFromSavedAddress(
  address: CustomerAddress,
  email: string
): ShippingAddressValues {
  return {
    email,
    firstName: address.firstName ?? '',
    lastName: address.lastName ?? '',
    address1: address.address1 ?? '',
    address2: address.address2 ?? '',
    city: address.city ?? '',
    state: address.state ?? '',
    zip: address.zip ?? '',
    country: address.country ?? '',
    phone: address.phone ?? '',
  };
}

function formatSavedAddressLine(address: CustomerAddress): string {
  const name = [address.firstName, address.lastName].filter(Boolean).join(' ');
  const cityLine = [address.city, address.state, address.zip]
    .filter(Boolean)
    .join(', ');
  return [name, address.address1, cityLine].filter(Boolean).join(' · ');
}

/** Prefer shipping defaults, then any default, then stable id order. */
function sortSavedForCheckout(addresses: CustomerAddress[]): CustomerAddress[] {
  return [...addresses].sort((a, b) => {
    if (a.isDefaultShipping !== b.isDefaultShipping) {
      return a.isDefaultShipping ? -1 : 1;
    }
    if (a.isDefaultBilling !== b.isDefaultBilling) {
      return a.isDefaultBilling ? -1 : 1;
    }
    return a.id.localeCompare(b.id);
  });
}

export function ShippingAddressForm({
  initialAddress,
  savedAddresses = [],
  customerEmail,
}: {
  initialAddress?: CheckoutAddress;
  savedAddresses?: CustomerAddress[];
  customerEmail?: string | null;
}) {
  const updateShippingAddress = useCheckoutStore((s) => s.updateShippingAddress);
  const isLoading = useCheckoutStore((s) => s.isLoading);
  const [formError, setFormError] = useState<string | null>(null);

  const sortedSaved = useMemo(
    () => sortSavedForCheckout(savedAddresses),
    [savedAddresses]
  );
  const defaultSavedId =
    sortedSaved.find((a) => a.isDefaultShipping)?.id ??
    sortedSaved[0]?.id ??
    null;

  const [selection, setSelection] = useState<string>(
    sortedSaved.length > 0 && defaultSavedId ? defaultSavedId : 'new'
  );

  const initialDefaults = (() => {
    if (initialAddress?.address1) {
      return defaultsFromSession(initialAddress, customerEmail);
    }
    if (defaultSavedId) {
      const saved = sortedSaved.find((a) => a.id === defaultSavedId);
      if (saved) {
        return valuesFromSavedAddress(
          saved,
          customerEmail ?? initialAddress?.email ?? ''
        );
      }
    }
    return defaultsFromSession(initialAddress, customerEmail);
  })();

  const form = useForm<ShippingAddressValues>({
    resolver: zodResolver(shippingAddressSchema),
    defaultValues: initialDefaults,
  });

  const applySavedSelection = (value: string) => {
    setSelection(value);
    setFormError(null);
    if (value === 'new') return;
    const saved = sortedSaved.find((a) => a.id === value);
    if (!saved) return;
    const email =
      form.getValues('email') ||
      customerEmail ||
      initialAddress?.email ||
      '';
    form.reset(valuesFromSavedAddress(saved, email));
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updateShippingAddress({
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        address1: values.address1,
        address2: values.address2 || undefined,
        city: values.city,
        state: values.state || undefined,
        zip: values.zip || undefined,
        country: values.country,
        phone: values.phone || undefined,
        useForBilling: true,
      });
    } catch {
      setFormError('Could not save shipping address. Please try again.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={formError} />

        {sortedSaved.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Saved addresses</legend>
            <RadioGroup
              value={selection}
              onValueChange={(value) => {
                if (typeof value === 'string') applySavedSelection(value);
              }}
              className="gap-3"
            >
              {sortedSaved.map((address) => {
                const label = address.label?.trim() || 'Saved address';
                return (
                  <label
                    key={address.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors',
                      selection === address.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/40'
                    )}
                  >
                    <RadioGroupItem
                      value={address.id}
                      className="mt-0.5"
                      aria-label={label}
                    />
                    <span className="min-w-0">
                      <span className="font-medium">{label}</span>
                      {address.isDefaultShipping && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Default shipping
                        </span>
                      )}
                      <span className="mt-0.5 block text-muted-foreground">
                        {formatSavedAddressLine(address)}
                      </span>
                    </span>
                  </label>
                );
              })}
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors',
                  selection === 'new'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/40'
                )}
              >
                <RadioGroupItem
                  value="new"
                  className="mt-0.5"
                  aria-label="Enter a new address"
                />
                <span className="font-medium">Enter a new address</span>
              </label>
            </RadioGroup>
          </fieldset>
        )}

        <Field>
          <FieldLabel htmlFor="checkout-email">Email</FieldLabel>
          <Input
            id="checkout-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="checkout-firstName">First name</FieldLabel>
            <Input
              id="checkout-firstName"
              autoComplete="given-name"
              aria-invalid={!!form.formState.errors.firstName}
              {...form.register('firstName')}
            />
            <FieldError errors={[form.formState.errors.firstName]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="checkout-lastName">Last name</FieldLabel>
            <Input
              id="checkout-lastName"
              autoComplete="family-name"
              aria-invalid={!!form.formState.errors.lastName}
              {...form.register('lastName')}
            />
            <FieldError errors={[form.formState.errors.lastName]} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="checkout-address1">Address</FieldLabel>
          <Input
            id="checkout-address1"
            autoComplete="address-line1"
            aria-invalid={!!form.formState.errors.address1}
            {...form.register('address1')}
          />
          <FieldError errors={[form.formState.errors.address1]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="checkout-address2">
            Apartment, suite, etc. (optional)
          </FieldLabel>
          <Input
            id="checkout-address2"
            autoComplete="address-line2"
            {...form.register('address2')}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="checkout-city">City</FieldLabel>
            <Input
              id="checkout-city"
              autoComplete="address-level2"
              aria-invalid={!!form.formState.errors.city}
              {...form.register('city')}
            />
            <FieldError errors={[form.formState.errors.city]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="checkout-state">State / province (optional)</FieldLabel>
            <Input
              id="checkout-state"
              autoComplete="address-level1"
              {...form.register('state')}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="checkout-zip">Postal code (optional)</FieldLabel>
            <Input
              id="checkout-zip"
              autoComplete="postal-code"
              {...form.register('zip')}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="checkout-country">Country</FieldLabel>
            <Input
              id="checkout-country"
              autoComplete="country"
              placeholder="US"
              aria-invalid={!!form.formState.errors.country}
              {...form.register('country')}
            />
            <FieldError errors={[form.formState.errors.country]} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="checkout-phone">Phone (optional)</FieldLabel>
          <Input
            id="checkout-phone"
            type="tel"
            autoComplete="tel"
            {...form.register('phone')}
          />
        </Field>

        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Continue to shipping'}
        </Button>
      </FieldGroup>
    </form>
  );
}
