import { Skeleton } from '@/components/ui/skeleton';

export function HeroBannerSkeleton() {
  return (
    <section className="bg-muted">
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8 lg:py-40">
        <Skeleton className="mx-auto h-12 w-80 sm:h-14 sm:w-96" />
        <Skeleton className="mx-auto mt-6 h-6 w-64 sm:w-96" />
        <Skeleton className="mx-auto mt-8 h-11 w-32" />
      </div>
    </section>
  );
}
