import Link from 'next/link';
import { sdk } from '@/lib/sdk';
import { ProductGrid } from '@/components/products/ProductGrid';
import type { StorefrontProduct } from '@/components/products/ProductCard';
import { toStorefrontProduct } from '@/lib/catalog-view';

export async function FeaturedProducts() {
  let products: StorefrontProduct[] = [];

  try {
    const response = await sdk.products.list({
      limit: 8,
      filters: { isEnabled: true },
      include: ['priceRange'],
    });
    products = (response.data ?? []).map(toStorefrontProduct);
  } catch {
    // Intentional slot fallback (storefront-content-architecture.md):
    // homepage slots degrade silently; they never take down the homepage.
  }

  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Featured Products
          </h2>
          <Link
            href="/products"
            className="hidden text-sm font-medium text-[var(--color-primary)] transition-colors hover:underline sm:block"
          >
            View all
          </Link>
        </div>
        <div className="mt-8">
          <ProductGrid products={products} />
        </div>
        <div className="mt-8 text-center sm:hidden">
          <Link
            href="/products"
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            View all products
          </Link>
        </div>
      </div>
    </section>
  );
}
