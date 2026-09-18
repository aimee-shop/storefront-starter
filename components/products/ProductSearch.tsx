'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';

export function ProductSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get('q') ?? '';

  function handleSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  }

  return (
    <Input
      placeholder="Search products..."
      defaultValue={currentQuery}
      className="h-8 w-44 sm:w-56"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleSearch(e.currentTarget.value);
        }
      }}
    />
  );
}
