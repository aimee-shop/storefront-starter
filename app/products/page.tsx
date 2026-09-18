import type { Metadata } from 'next';
import Link from 'next/link';
import { sdk } from '@/lib/sdk';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductSort } from '@/components/products/ProductSort';
import { ProductSearch } from '@/components/products/ProductSearch';
import { ProductFilters } from '@/components/products/ProductFilters';
import { ActiveFilters } from '@/components/products/ActiveFilters';
import { ProductPagination } from '@/components/products/ProductPagination';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import type { StorefrontProduct } from '@/components/products/ProductCard';

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const categorySlug = typeof params.category === 'string' ? params.category : undefined;
  return {
    title: 'Shop All Products',
    description: 'Browse our full collection of quality products.',
    // Category-filtered views are first-class crawl targets (listed in the
    // sitemap), so they self-canonicalize; other params (sort, page, facets,
    // search) canonicalize to the base catalog.
    alternates: {
      canonical: categorySlug
        ? `/products?category=${encodeURIComponent(categorySlug)}`
        : '/products',
    },
  };
}

const BROWSE_SORT_MAP: Record<string, { sort: string; order: 'asc' | 'desc' }> = {
  newest: { sort: 'createdAt', order: 'desc' },
  bestselling: { sort: 'totalSold', order: 'desc' },
  'price-asc': { sort: 'price', order: 'asc' },
  'price-desc': { sort: 'price', order: 'desc' },
  'name-asc': { sort: 'name', order: 'asc' },
};

const SEARCH_SORT_MAP: Record<string, { field: string; order: 'asc' | 'desc' }[]> = {
  relevance: [{ field: 'relevance', order: 'desc' }],
  newest: [{ field: 'createdAt', order: 'desc' }],
  bestselling: [{ field: 'totalSold', order: 'desc' }],
  'price-asc': [{ field: 'price', order: 'asc' }],
  'price-desc': [{ field: 'price', order: 'desc' }],
  'name-asc': [{ field: 'name', order: 'asc' }],
};

const PAGE_SIZE = 12;

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Extract facet filter values from URL params using known facet keys */
function parseFacetParams(
  params: Record<string, string | string[] | undefined>,
  facetKeys: string[]
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const key of facetKeys) {
    const val = params[key];
    if (val) {
      result[key] = Array.isArray(val) ? val : [val];
    }
  }
  return result;
}

// No ISR here: reading searchParams (filters, search, pagination) forces
// dynamic rendering, which is intended for the catalog (see the performance
// table in storefront-content-architecture.md). Store config on this
// route is still served from the 300s data cache in lib/store-config.ts.
export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const sortKey = typeof params.sort === 'string' ? params.sort : undefined;
  const page = Math.max(1, Number(params.page) || 1);
  const query = typeof params.q === 'string' ? params.q : undefined;
  const sale = params.sale === 'true';
  const categorySlug = typeof params.category === 'string' ? params.category : undefined;

  const isSearchMode = Boolean(query);

  // Categories/facets are filter chrome, not the catalog itself. Empty store
  // trees (404) or role gaps on facet options must not take down /products --
  // that surfaces as a root error boundary digest and floods the console when
  // every nav Link prefetches this route.
  const [categoriesResult, facetsResult] = await Promise.allSettled([
    sdk.categories.getTree(),
    sdk.facets.getOptions(),
  ]);
  const categories: FindableCategoryNode[] =
    categoriesResult.status === 'fulfilled'
      ? (categoriesResult.value as FindableCategoryNode[])
      : [];
  if (categoriesResult.status === 'rejected') {
    console.error(
      '[storefront] categories tree fetch failed:',
      categoriesResult.reason
    );
  }
  const facetOptions: Record<string, string[]> =
    facetsResult.status === 'fulfilled'
      ? (facetsResult.value.facets ?? {})
      : {};
  if (facetsResult.status === 'rejected') {
    console.error(
      '[storefront] facet options fetch failed:',
      facetsResult.reason
    );
  }

  const facetKeys = Object.keys(facetOptions);
  const activeFacets = parseFacetParams(params, facetKeys);

  // Product list/search failures still propagate to the root error boundary --
  // a blank-but-200 catalog would hide a real outage.
  let products: StorefrontProduct[] = [];
  let total = 0;
  let searchFacets: { field: string; values: { value: string; count: number }[] }[] | undefined;

  if (isSearchMode && query) {
    // Search mode: use sdk.search.products()
    const searchFilters: { field: string; operator: 'eq'; value: string }[] = [];
    if (categorySlug) {
      searchFilters.push({ field: 'category', operator: 'eq', value: categorySlug });
    }
    for (const [key, values] of Object.entries(activeFacets)) {
      for (const v of values) {
        searchFilters.push({ field: key, operator: 'eq', value: v });
      }
    }

    const searchSort = SEARCH_SORT_MAP[sortKey ?? 'relevance'] ?? SEARCH_SORT_MAP.relevance;
    const results = await sdk.search.products({
      query,
      filters: searchFilters,
      facets: facetKeys.length > 0 ? facetKeys : undefined,
      sort: searchSort,
      page,
      limit: PAGE_SIZE,
    });
    products = (results.items ?? []) as unknown as StorefrontProduct[];
    searchFacets = results.facets as typeof searchFacets;
    total = results.metadata?.totalCount ?? 0;
  } else {
    // Browse mode: use sdk.products.list()
    const browseSort = BROWSE_SORT_MAP[sortKey ?? 'newest'] ?? BROWSE_SORT_MAP.newest;
    const filters: { isEnabled: boolean; search?: string; categorySlug?: string } = {
      isEnabled: true,
    };
    if (categorySlug) filters.categorySlug = categorySlug;

    const productsResponse = await sdk.products.list({
      page,
      limit: PAGE_SIZE,
      sort: browseSort.sort,
      order: browseSort.order,
      filters,
      include: ['priceRange'],
    });
    products = (productsResponse.data ?? []) as StorefrontProduct[];
    total = productsResponse.meta?.total ?? 0;
  }

  // KNOWN LIMITATION: the sale filter is applied client-side AFTER pagination,
  // so it only filters the current page (12 items), not the whole catalog --
  // the products API has no onSale filter (confirmed gap, tracked via core-api
  // handoff). Page counts also reflect the unfiltered total while sale=true.
  // TODO: Replace with server-side onSale filter when the API supports it.
  const filteredProducts = sale
    ? products.filter((p) => p.compareAtPrice && p.compareAtPrice > (p.price ?? 0))
    : products;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Find category name for active filters display
  const activeCategoryName = categorySlug
    ? findCategoryName(categories, categorySlug)
    : undefined;

  return (
    <div className="py-6 sm:py-10 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
            </li>
            <li aria-hidden="true"><ChevronIcon /></li>
            <li className="font-medium text-foreground">
              {query ? `Results for "${query}"` : 'Products'}
            </li>
          </ol>
        </nav>

        {/* Header row: title + search + filters + sort */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-2xl font-semibold tracking-tight">
            {query ? `Results for "${query}"` : 'All Products'}
          </h1>

          <div className="hidden sm:block">
            <ProductSearch />
          </div>

          {/* Mobile filter trigger */}
          <Sheet>
            <SheetTrigger className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted lg:hidden">
              <FilterIcon />
              Filters
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto p-6">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <ProductFilters
                  categories={categories}
                  facetOptions={facetOptions}
                  searchFacets={searchFacets}
                  activeFacets={activeFacets}
                />
              </div>
            </SheetContent>
          </Sheet>

          <ProductSort showRelevance={isSearchMode} />
        </div>

        {total > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Showing {filteredProducts.length} of {total} products
          </p>
        )}

        <Separator className="my-6" />

        {/* Active filter chips */}
        <ActiveFilters activeFacets={activeFacets} categoryName={activeCategoryName} />

        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <ProductFilters
              categories={categories}
              facetOptions={facetOptions}
              searchFacets={searchFacets}
              activeFacets={activeFacets}
            />
          </aside>

          {/* Main content */}
          <div>
            <ProductGrid products={filteredProducts} />

            {totalPages > 1 && (
              <div className="mt-12">
                <ProductPagination
                  currentPage={page}
                  totalPages={totalPages}
                  basePath="/products"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FindableCategoryNode {
  id: string;
  slug: string;
  name: string;
  children?: FindableCategoryNode[];
}

/** Recursively find a category name by slug in a tree */
function findCategoryName(
  categories: FindableCategoryNode[],
  slug: string
): string | undefined {
  for (const cat of categories) {
    if (cat.slug === slug) return cat.name;
    if (cat.children) {
      const found = findCategoryName(cat.children, slug);
      if (found) return found;
    }
  }
  return undefined;
}

function FilterIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}
