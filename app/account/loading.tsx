import { Skeleton } from '@/components/ui/skeleton';

export default function AccountLoading() {
  return (
    <div className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-md px-4 text-center sm:px-6 lg:px-8">
        <div className="rounded-lg border p-8">
          <Skeleton className="mx-auto h-12 w-12 rounded-full" />
          <Skeleton className="mx-auto mt-4 h-8 w-40" />
          <Skeleton className="mx-auto mt-2 h-4 w-56" />
          <Skeleton className="mx-auto mt-6 h-9 w-24" />
        </div>
      </div>
    </div>
  );
}
