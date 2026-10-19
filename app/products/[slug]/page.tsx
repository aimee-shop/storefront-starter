import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NotFoundError } from '@aimee.shop/sdk';
import { sdk } from '@/lib/sdk';
import { formatListedPrice, formatPrice, priceRangeSpans } from '@/lib/format';
import { ProductDetailImages } from '@/components/products/ProductDetailImages';
import { ProductAttachedModules } from '@/components/products/ProductAttachedModules';
import { ProductReviews } from '@/components/products/ProductReviews';
import { AddToCartButton } from '@/components/products/AddToCartButton';
import { loadProductReviews } from '@/lib/load-product-reviews';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { loadProductModules } from '@/lib/load-product-modules';
import { groupByPlacement } from '@/lib/product-modules';
import {
  getAvailabilityState,
  isProductSellable,
  type AvailabilityState,
} from '@/lib/product-availability';
import { toProductDetail } from '@/lib/catalog-view';

const AVAILABILITY_DOT: Record<Exclude<AvailabilityState, 'unknown'>, string> = {
  'in-stock': 'bg-green-500',
  'low-stock': 'bg-amber-500',
  backorder: 'bg-amber-500',
  unavailable: 'bg-muted-foreground',
};

const AVAILABILITY_LABEL: Record<Exclude<AvailabilityState, 'unknown'>, string> = {
  'in-stock': 'In stock and ready to ship',
  'low-stock': 'In stock -- only a few left',
  backorder: 'Available on backorder',
  unavailable: 'Currently unavailable',
};

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// ISR: product detail revalidates every 60s (storefront-content-architecture.md)
export const revalidate = 60;

// No slugs prerendered at build; each product is generated on first request
// and cached (on-demand ISR). Without this, the route would be fully dynamic.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await sdk.products.getBySlug(slug);
    return {
      title: product.name,
      description: product.metaDescription ?? product.description ?? `Shop ${product.name}.`,
      alternates: { canonical: `/products/${slug}` },
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;

  let product: ReturnType<typeof toProductDetail>;
  try {
    const response = await sdk.products.getBySlug(slug, {
      include: ['variants', 'categories', 'priceRange'],
    });
    product = toProductDetail(response);
  } catch (error) {
    // Only a genuine 404 becomes the not-found page; outages and other
    // failures propagate to the root error boundary.
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const images = product.images ?? [];
  const price = product.price ?? product.priceRange?.min;
  const currency = product.priceRange?.currency ?? product.currency;
  const listed = formatListedPrice(product);
  const compareAtPrice = product.compareAtPrice;
  // A "From {min}" label has no single price to strike through.
  const hasSale =
    !priceRangeSpans(product.priceRange) &&
    compareAtPrice &&
    compareAtPrice > (price ?? 0);
  const categories = product.categories ?? [];
  const percentOff = hasSale && price && compareAtPrice
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : null;
  // Catalog include is the only stock read the storefront key may make.
  const [moduleItems, variants, reviews] = await Promise.all([
    loadProductModules(product.id),
    sdk.variants
      .listByProduct(product.id, { include: ['inventory'] })
      .catch((error: unknown) => {
        console.error('[storefront] variant inventory lookup failed', error);
        return [];
      }),
    loadProductReviews(product.id),
  ]);
  const modules = groupByPlacement(moduleItems);
  const variant = variants[0] ?? product.variants[0];
  const availabilityInput = {
    isAvailable: product.isAvailable,
    variantId: variant?.id,
    inventory: variant?.inventory,
    productTracked: product.isInventoryTracked,
    variantTracked: variant?.isInventoryTracked,
  };
  const availability = getAvailabilityState(availabilityInput);
  const sellable = isProductSellable(availabilityInput);

  return (
    <div className="py-6 sm:py-10 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-muted-foreground">
            <li>
              <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
            </li>
            <li aria-hidden="true"><ChevronIcon /></li>
            <li>
              <Link href="/products" className="transition-colors hover:text-foreground">Products</Link>
            </li>
            {categories[0] && (
              <>
                <li aria-hidden="true"><ChevronIcon /></li>
                <li>
                  <Link
                    href={`/products?category=${categories[0].slug}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {categories[0].name}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden="true"><ChevronIcon /></li>
            <li className="truncate font-medium text-foreground">{product.name}</li>
          </ol>
        </nav>

        <ProductAttachedModules
          items={modules.top}
          placement="top"
          className="mb-8 space-y-8"
        />

        {/* Product layout: two columns on desktop */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-16">
          {/* Left: images */}
          <div className="min-w-0">
            <ProductDetailImages images={images} productName={product.name} />
          </div>

          {/* Right: product info */}
          <div className="mt-8 min-w-0 lg:mt-0">
            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {product.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {product.name}
            </h1>

            {/* Price */}
            <div className="mt-3 flex items-baseline gap-2.5">
              {listed != null && (
                <span className="text-2xl font-bold">
                  {listed}
                </span>
              )}
              {hasSale && compareAtPrice != null && (
                <span className="text-base text-muted-foreground line-through">
                  {formatPrice(compareAtPrice, currency)}
                </span>
              )}
              {percentOff && (
                <Badge variant="destructive" className="text-xs">
                  {percentOff}% off
                </Badge>
              )}
            </div>

            {/* Short description */}
            {product.description && (
              <p className="mt-4 leading-relaxed text-muted-foreground">
                {product.description}
              </p>
            )}

            <Separator className="my-6" />

            {/* Add to cart */}
            <AddToCartButton
              productId={product.id}
              productVariantId={variant?.id ?? ''}
              disabled={!sellable}
            />

            {availability !== 'unknown' && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${AVAILABILITY_DOT[availability]}`}
                />
                <span className="text-muted-foreground">
                  {AVAILABILITY_LABEL[availability]}
                </span>
              </div>
            )}

            <ProductAttachedModules
              items={modules.sidebar}
              placement="sidebar"
              className="mt-8 space-y-8"
            />
          </div>
        </div>

        {/* Tabs below the fold */}
        <div className="mt-16">
          <Tabs defaultValue="description">
            <TabsList>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              {reviews && <TabsTrigger value="reviews">Reviews</TabsTrigger>}
            </TabsList>
            <TabsContent value="description" className="mt-6">
              {product.description ? (
                <div className="max-w-3xl leading-relaxed text-muted-foreground">
                  <p>{product.description}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No description available.</p>
              )}
            </TabsContent>
            <TabsContent value="details" className="mt-6">
              <dl className="grid max-w-2xl grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-medium">Product Type</dt>
                  <dd className="mt-1 text-muted-foreground">{product.productType ?? 'Standard'}</dd>
                </div>
                {product.tags?.length > 0 && (
                  <div>
                    <dt className="font-medium">Tags</dt>
                    <dd className="mt-1 text-muted-foreground">{product.tags.join(', ')}</dd>
                  </div>
                )}
                {categories.length > 0 && (
                  <div>
                    <dt className="font-medium">Categories</dt>
                    <dd className="mt-1 text-muted-foreground">
                      {categories.map((c) => c.name).join(', ')}
                    </dd>
                  </div>
                )}
              </dl>
            </TabsContent>
            {reviews && (
              <TabsContent value="reviews" className="mt-6">
                <ProductReviews
                  productId={product.id}
                  productSlug={product.slug}
                  initial={reviews}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <ProductAttachedModules
          items={modules.bottom}
          placement="bottom"
          className="mt-16 space-y-8"
        />
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}
