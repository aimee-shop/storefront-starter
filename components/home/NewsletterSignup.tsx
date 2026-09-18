'use client';

import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { subscribeNewsletterAction } from '@/app/newsletter/actions';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setErrorMessage(null);

    try {
      const result = await subscribeNewsletterAction({ email });

      if (result.ok) {
        setStatus('success');
        setEmail('');
        return;
      }

      setStatus('error');
      setErrorMessage(
        result.fieldErrors?.email ??
          result.formError ??
          'Something went wrong. Please try again.'
      );
    } catch {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  }

  return (
    <section className="bg-muted/50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Stay in the loop
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Get the latest on new products, exclusive offers, and more delivered
          straight to your inbox.
        </p>

        {status === 'success' ? (
          <p className="mt-8 text-sm font-medium text-green-600">
            Thanks for subscribing! Check your inbox for a confirmation.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
              disabled={status === 'loading'}
              aria-invalid={status === 'error'}
            />
            <Button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>
        )}

        {status === 'error' && errorMessage && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
}
