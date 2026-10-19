import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  formatListedPrice,
  formatPrice,
  priceRangeSpans,
  type ListedProductPrice,
} from '@/lib/format';

export interface StorefrontProduct {
  id: string;
  slug: string;
  name: string;
  price?: number | null;
  compareAtPrice?: number | null;
  /** ISO currency from the payload when there is no price range. */
  currency?: string;
  images?: { url: string; alt?: string | null }[] | null;
  priceRange?: ListedProductPrice['priceRange'];
}

interface ProductCardProps {
  product: StorefrontProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const image = product.images?.[0];
  const price = product.price ?? product.priceRange?.min;
  const currency = product.priceRange?.currency ?? product.currency;
  const listed = formatListedPrice(product);
  // A "From {min}" label has no single price to strike through.
  const hasSale =
    !priceRangeSpans(product.priceRange) &&
    product.compareAtPrice &&
    product.compareAtPrice > (price ?? 0);

  return (
    <Link
      href={`/products/${product.slug}`}
      prefetch={false}
      className="group block rounded-xl border border-transparent transition-all duration-200 hover:border-border hover:shadow-md"
    >
      {/* Image area */}
      <div className="relative overflow-hidden rounded-t-xl bg-muted">
        <div className="aspect-[4/5]">
          {image ? (
            <Image
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/60">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
          )}
        </div>

        {/* Sale badge */}
        {hasSale && (
          <Badge variant="destructive" className="absolute left-3 top-3 shadow-sm">
            Sale
          </Badge>
        )}

        {/* Quick view overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-2 justify-center pb-4 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur-sm">
            Quick View
          </span>
        </div>
      </div>

      {/* Info area */}
      <div className="p-4">
        <h3 className="line-clamp-2 text-[0.925rem] font-medium leading-snug">
          {product.name}
        </h3>
        <div className="mt-2 flex items-baseline gap-2">
          {listed != null && (
            <span className="text-base font-semibold">
              {listed}
            </span>
          )}
          {hasSale && product.compareAtPrice != null && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(product.compareAtPrice, currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
