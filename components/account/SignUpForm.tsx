'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerAction } from '@/app/account/actions';
import { signUpSchema, type SignUpValues } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FormAlert } from './FormAlert';
import { applyAuthResult } from '@/lib/auth-form';

export function SignUpForm({ nextPath }: { nextPath?: string | null }) {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await registerAction(values, nextPath);
      applyAuthResult(result, form.setError, setFormError);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={formError} />
        <div className="grid gap-6 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="signup-first-name">First name</FieldLabel>
            <Input
              id="signup-first-name"
              autoComplete="given-name"
              placeholder="Jane"
              {...form.register('firstName')}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="signup-last-name">Last name</FieldLabel>
            <Input
              id="signup-last-name"
              autoComplete="family-name"
              placeholder="Doe"
              {...form.register('lastName')}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="signup-email">Email</FieldLabel>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-password">Password</FieldLabel>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!form.formState.errors.password}
            {...form.register('password')}
          />
          <FieldError errors={[form.formState.errors.password]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="signup-confirm-password">Confirm password</FieldLabel>
          <Input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!form.formState.errors.confirmPassword}
            {...form.register('confirmPassword')}
          />
          <FieldError errors={[form.formState.errors.confirmPassword]} />
        </Field>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Creating Account...' : 'Create Account'}
        </Button>
      </FieldGroup>
    </form>
  );
}
