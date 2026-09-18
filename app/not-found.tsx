import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Global 404 boundary. Rendered for unmatched routes and notFound() calls
 * (product/blog detail pages map platform NotFoundError to this). Renders
 * inside the root layout, so the header and footer remain visible.
 */
export default function NotFound() {
  return (
    <div className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-md px-4 text-center sm:px-6 lg:px-8">
        <div className="rounded-lg border p-8">
          <SearchIcon />
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            Page not found
          </h1>
          <p className="mt-2 text-muted-foreground">
            The page you are looking for does not exist or may have been moved.
          </p>
          <Button className="mt-6" render={<Link href="/" />}>
            Back to home
          </Button>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
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
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  );
}
