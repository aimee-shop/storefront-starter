'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CustomerAddress } from '@aimee.shop/sdk';
import {
  createAddressAction,
  updateAddressAction,
} from '@/app/account/addresses/actions';
import {
  ADDRESS_TYPES,
  ADDRESS_TYPE_LABELS,
  addressSchema,
  isAddressType,
  type AddressFormValues,
} from '@/lib/validations/address';
import { applyAuthResult } from '@/lib/auth-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FormAlert } from './FormAlert';

function defaultsFromAddress(
  address?: CustomerAddress | null
): AddressFormValues {
  return {
    type:
      address?.type && isAddressType(address.type) ? address.type : 'shipping',
    firstName: address?.firstName ?? '',
    lastName: address?.lastName ?? '',
    label: address?.label ?? '',
    address1: address?.address1 ?? '',
    address2: address?.address2 ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    zip: address?.zip ?? '',
    country: address?.country ?? '',
    phone: address?.phone ?? '',
  };
}

export function AddressForm({
  address,
  onSuccess,
  onCancel,
}: {
  address?: CustomerAddress | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const addressId = address?.id;
  const isEdit = Boolean(addressId);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // Parent remounts this form with key={address?.id ?? 'new'} when switching
  // create/edit so defaultValues stay in sync without an effect.
  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: defaultsFromAddress(address),
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = addressId
        ? await updateAddressAction(addressId, values)
        : await createAddressAction(values);
      if (result.ok) {
        onSuccess();
        return;
      }
      applyAuthResult(result, form.setError, setFormError);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={formError} />

        <Field>
          <FieldLabel htmlFor="address-type">Type</FieldLabel>
          <select
            id="address-type"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            aria-invalid={!!form.formState.errors.type}
            {...form.register('type')}
          >
            {ADDRESS_TYPES.map((type) => (
              <option key={type} value={type}>
                {ADDRESS_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <FieldError errors={[form.formState.errors.type]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="address-label">Label (optional)</FieldLabel>
          <Input
            id="address-label"
            placeholder="Home, Office, ..."
            {...form.register('label')}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="address-firstName">First name</FieldLabel>
            <Input
              id="address-firstName"
              autoComplete="given-name"
              {...form.register('firstName')}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="address-lastName">Last name</FieldLabel>
            <Input
              id="address-lastName"
              autoComplete="family-name"
              {...form.register('lastName')}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="address-address1">Street address</FieldLabel>
          <Input
            id="address-address1"
            autoComplete="address-line1"
            aria-invalid={!!form.formState.errors.address1}
            {...form.register('address1')}
          />
          <FieldError errors={[form.formState.errors.address1]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="address-address2">
            Apartment, suite, etc. (optional)
          </FieldLabel>
          <Input
            id="address-address2"
            autoComplete="address-line2"
            {...form.register('address2')}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="address-city">City</FieldLabel>
            <Input
              id="address-city"
              autoComplete="address-level2"
              aria-invalid={!!form.formState.errors.city}
              {...form.register('city')}
            />
            <FieldError errors={[form.formState.errors.city]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="address-state">State / province</FieldLabel>
            <Input
              id="address-state"
              autoComplete="address-level1"
              {...form.register('state')}
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="address-zip">Postal code</FieldLabel>
            <Input
              id="address-zip"
              autoComplete="postal-code"
              aria-invalid={!!form.formState.errors.zip}
              {...form.register('zip')}
            />
            <FieldError errors={[form.formState.errors.zip]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="address-country">Country</FieldLabel>
            <Input
              id="address-country"
              autoComplete="country"
              placeholder="US"
              aria-invalid={!!form.formState.errors.country}
              {...form.register('country')}
            />
            <FieldError errors={[form.formState.errors.country]} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="address-phone">Phone (optional)</FieldLabel>
          <Input
            id="address-phone"
            type="tel"
            autoComplete="tel"
            {...form.register('phone')}
          />
        </Field>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? isEdit
                ? 'Saving...'
                : 'Adding...'
              : isEdit
                ? 'Save address'
                : 'Add address'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
