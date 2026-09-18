'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordAction } from '@/app/account/actions';
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FormAlert } from './FormAlert';
import { applyAuthResult } from '@/lib/auth-form';

export function ResetPasswordForm({ initialEmail }: { initialEmail: string }) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: initialEmail, confirmationCode: '', newPassword: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      // On success the action redirects to /account?reset=1.
      const result = await resetPasswordAction(values);
      applyAuthResult(result, form.setError, setFormError);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={formError} />
        <Field>
          <FieldLabel htmlFor="reset-email">Email</FieldLabel>
          <Input
            id="reset-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="reset-code">Verification code</FieldLabel>
          <Input
            id="reset-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            aria-invalid={!!form.formState.errors.confirmationCode}
            {...form.register('confirmationCode')}
          />
          <FieldError errors={[form.formState.errors.confirmationCode]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="reset-new-password">New password</FieldLabel>
          <Input
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!form.formState.errors.newPassword}
            {...form.register('newPassword')}
          />
          <FieldError errors={[form.formState.errors.newPassword]} />
        </Field>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Resetting...' : 'Reset Password'}
        </Button>
      </FieldGroup>
    </form>
  );
}
