import { Skeleton } from '@/components/ui/skeleton';

export function CmsPageSkeleton() {
  return (
    <div className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <Skeleton className="mx-auto h-10 w-64 sm:h-12 sm:w-80" />
          <Skeleton className="mx-auto mt-4 h-6 w-48 sm:w-72" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-5/6" />
          <Skeleton className="h-6 w-4/6" />
          <Skeleton className="mt-8 h-48 w-full rounded-lg" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      </div>
    </div>
  );
}
