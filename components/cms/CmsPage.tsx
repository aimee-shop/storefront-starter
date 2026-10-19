import { getCachedPublicContent } from '@/lib/cms-content';
import { fetchBlockProducts } from '@/lib/block-products';
import { StorefrontBlockRenderer } from '@/components/blocks/BlockPage';
import { toBlocks } from '@/lib/product-modules';

interface CmsPageProps {
  collection: string;
  slug: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export async function CmsPage({ collection, slug, title, subtitle, children }: CmsPageProps) {
  let blocks: ReturnType<typeof toBlocks> = [];

  try {
    const entry = await getCachedPublicContent(collection, slug);
    blocks = toBlocks(entry.blocks);
  } catch {
    // Intentional slot fallback (storefront-content-architecture.md):
    // missing content or outage renders the "Content coming soon" state.
  }

  const products = blocks?.length ? await fetchBlockProducts(blocks) : undefined;

  return (
    <div className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && (
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        {blocks?.length ? (
          <StorefrontBlockRenderer blocks={blocks} products={products} />
        ) : (
          <div className="mx-auto max-w-md rounded-2xl bg-muted/50 px-8 py-16 text-center">
            <svg
              className="mx-auto h-10 w-10 text-muted-foreground/40"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <p className="mt-4 font-medium text-muted-foreground">Content coming soon</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              This page can be customized from the admin dashboard.
            </p>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
