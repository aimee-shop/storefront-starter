'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Root error boundary. Catches errors thrown during rendering or data
 * fetching on any route (catalog/list pages intentionally propagate SDK
 * failures here instead of rendering blank-but-200 pages). Renders inside
 * the root layout, so the header and footer remain visible.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // digest is the only server-error handle available in production builds
    // (full message is stripped to avoid leaking internals).
    console.error(
      '[storefront] route error:',
      error.message,
      error.digest ? `digest=${error.digest}` : error
    );
  }, [error]);

  return (
    <div className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-md px-4 text-center sm:px-6 lg:px-8">
        <div className="rounded-lg border p-8">
          <AlertIcon />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-2 text-muted-foreground">
            We could not load this page. Please try again in a moment.
          </p>
          <Button className="mt-6" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg
      className="mx-auto h-12 w-12 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
    </svg>
  );
}
