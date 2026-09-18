'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ActiveFiltersProps {
  activeFacets: Record<string, string[]>;
  categoryName?: string;
}

export function ActiveFilters({ activeFacets, categoryName }: ActiveFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hasCategory = searchParams.has('category');
  const hasSale = searchParams.get('sale') === 'true';
  const facetEntries = Object.entries(activeFacets).flatMap(([key, values]) =>
    values.map((v) => ({ key, value: v }))
  );
  const hasAny = hasCategory || hasSale || facetEntries.length > 0;

  if (!hasAny) return null;

  function removeParam(key: string, value?: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      // Remove specific value from multi-value param
      const current = params.getAll(key);
      params.delete(key);
      for (const v of current) {
        if (v !== value) params.append(key, v);
      }
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  }

  function clearAll() {
    const params = new URLSearchParams();
    const q = searchParams.get('q');
    const sort = searchParams.get('sort');
    if (q) params.set('q', q);
    if (sort) params.set('sort', sort);
    router.push(`/products?${params.toString()}`);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {hasCategory && categoryName && (
        <FilterChip
          label={`Category: ${categoryName}`}
          onRemove={() => removeParam('category')}
        />
      )}
      {facetEntries.map(({ key, value }) => (
        <FilterChip
          key={`${key}-${value}`}
          label={`${titleCase(key)}: ${value}`}
          onRemove={() => removeParam(key, value)}
        />
      ))}
      {hasSale && (
        <FilterChip label="On Sale" onRemove={() => removeParam('sale')} />
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={clearAll}
        className="text-xs text-muted-foreground"
      >
        Clear all
      </Button>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 pr-1 text-xs font-normal">
      {label}
      <button
        onClick={(e) => {
          e.preventDefault();
          onRemove();
        }}
        className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-muted-foreground/20"
        aria-label={`Remove ${label} filter`}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </Badge>
  );
}

function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}
