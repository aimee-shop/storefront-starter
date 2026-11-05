'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { SearchFacet } from '@aimee.shop/sdk';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CategoryTree } from './CategoryTree';
import { FacetSection } from './FacetSection';

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  children?: CategoryNode[];
}

interface ProductFiltersProps {
  categories: CategoryNode[];
  facetOptions: Record<string, string[]>;
  searchFacets?: SearchFacet[];
  activeFacets: Record<string, string[]>;
}

export function ProductFilters({
  categories,
  facetOptions,
  searchFacets,
  activeFacets,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSale = searchParams.get('sale') === 'true';

  function toggleSale() {
    const params = new URLSearchParams(searchParams.toString());
    if (currentSale) {
      params.delete('sale');
    } else {
      params.set('sale', 'true');
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

  const facetKeys = Object.keys(facetOptions);
  const hasActiveFilters =
    searchParams.has('category') ||
    currentSale ||
    Object.values(activeFacets).some((v) => v.length > 0);

  // Build counts map per facet field from search results
  const facetCountMaps = new Map<string, Map<string, number>>();
  if (searchFacets) {
    for (const facet of searchFacets) {
      const map = new Map<string, number>();
      for (const bucket of facet.buckets) {
        map.set(String(bucket.key), bucket.count);
      }
      facetCountMaps.set(facet.field, map);
    }
  }

  const hasCategories = categories.length > 0;
  const hasFacets = facetKeys.length > 0;

  return (
    <div className="space-y-4">
      {/* Categories */}
      {hasCategories && <CategoryTree categories={categories} />}

      {/* Dynamic facet sections */}
      {hasFacets && (
        <>
          {hasCategories && <Separator />}
          {facetKeys.map((key) => (
            <FacetSection
              key={key}
              field={key}
              label={titleCase(key)}
              options={facetOptions[key]}
              counts={facetCountMaps.get(key)}
              selected={activeFacets[key] ?? []}
            />
          ))}
        </>
      )}

      {(hasCategories || hasFacets) && <Separator />}

      {/* Offers */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Offers
        </h3>
        <button
          onClick={toggleSale}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
            currentSale
              ? 'bg-accent font-medium text-accent-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <span
            className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]',
              currentSale
                ? 'border-foreground bg-foreground text-background'
                : 'border-muted-foreground/30'
            )}
          >
            {currentSale && '\u2713'}
          </span>
          On Sale
        </button>
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <>
          <Separator />
          <Button variant="ghost" size="sm" onClick={clearAll} className="w-full text-muted-foreground">
            Clear All Filters
          </Button>
        </>
      )}
    </div>
  );
}

function titleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}
