'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const BROWSE_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'bestselling', label: 'Best Selling' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A-Z' },
];

const RELEVANCE_OPTION = { value: 'relevance', label: 'Relevance' };

interface ProductSortProps {
  showRelevance?: boolean;
}

export function ProductSort({ showRelevance }: ProductSortProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultSort = showRelevance ? 'relevance' : 'newest';
  const currentSort = searchParams.get('sort') ?? defaultSort;

  const options = showRelevance
    ? [RELEVANCE_OPTION, ...BROWSE_SORT_OPTIONS]
    : BROWSE_SORT_OPTIONS;

  const currentLabel =
    options.find((o) => o.value === currentSort)?.label ?? 'Sort';

  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
      >
        <SortIcon />
        {currentLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup value={currentSort} onValueChange={handleSortChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5-4.5L16.5 16.5m0 0L12 12m4.5 4.5V3" />
    </svg>
  );
}
