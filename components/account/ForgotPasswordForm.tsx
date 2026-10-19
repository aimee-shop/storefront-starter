'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordAction } from '@/app/account/actions';
import { applyAuthResult } from '@/lib/auth-form';
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { FormAlert } from './FormAlert';

export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const email = form.getValues('email');

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, we&apos;ve sent password reset
          instructions with a verification code.
        </p>
        <Button
          className="w-full"
          render={
            <Link
              href={`/account/reset-password?email=${encodeURIComponent(email)}`}
            />
          }
        >
          Enter Reset Code
        </Button>
        <Button variant="outline" className="w-full" onClick={onBack}>
          Back to Sign In
        </Button>
      </div>
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await forgotPasswordAction(values);
      // 4xx and success share the same confirmation so the response does not
      // reveal whether an account exists. Outages stay on the form.
      if (!result || result.ok) {
        setSubmitted(true);
        return;
      }
      applyAuthResult(result, form.setError, setFormError);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={formError} />
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a code to reset your
          password.
        </p>
        <Field>
          <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Sending...' : 'Send Reset Code'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onBack}
        >
          Back to Sign In
        </Button>
      </FieldGroup>
    </form>
  );
}
