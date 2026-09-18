import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function ProductDetailLoading() {
  return (
    <div className="py-8 sm:py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb skeleton */}
        <Skeleton className="mb-8 h-4 w-48" />

        <div className="lg:grid lg:grid-cols-2 lg:gap-12">
          {/* Image skeleton */}
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-16 rounded-md sm:h-20 sm:w-20" />
              ))}
            </div>
          </div>

          {/* Info skeleton */}
          <div className="mt-8 lg:mt-0">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-9 w-3/4" />
            <Skeleton className="mt-4 h-8 w-32" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <Separator className="my-6" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="mt-4 h-4 w-40" />
          </div>
        </div>
      </div>
    </div>
  );
}
