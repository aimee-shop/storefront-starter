import type { MetadataRoute } from 'next';
import { sdk } from '@/lib/sdk';
import { config } from '@/lib/config';

// ISR: catalog/CMS-backed crawl manifest; hourly is plenty for search engines.
export const revalidate = 3600;

const PAGE_SIZE = 100;

// Indexable static routes. /account and /dev/* are deliberately excluded:
// robots.ts disallows them, and sitemap URLs blocked by robots.txt are
// flagged as errors by Search Console.
const STATIC_PATHS = [
  '/',
  '/about',
  '/blog',
  '/careers',
  '/contact',
  '/help',
  '/privacy',
  '/products',
  '/returns',
  '/shipping',
];

// Categories are a ?category=<slug> filter on /products, not dedicated pages
// (see app/products/page.tsx). Mirrors its page-local FindableCategoryNode.
interface CategoryNode {
  slug: string;
  isActive: boolean;
  children?: CategoryNode[];
}

function flattenCategorySlugs(nodes: CategoryNode[], slugs: string[] = []): string[] {
  for (const node of nodes) {
    // Inactive categories stay out of the sitemap, but their subtree may
    // still contain active children.
    if (node.isActive) slugs.push(node.slug);
    if (node.children?.length) flattenCategorySlugs(node.children, slugs);
  }
  return slugs;
}

async function productEntries(base: string): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  let page = 1;
  let total = Infinity;
  while (entries.length < total) {
    const response = await sdk.products.list({
      page,
      limit: PAGE_SIZE,
      filters: { isEnabled: true },
    });
    const data = response.data ?? [];
    if (data.length === 0) break;
    for (const product of data) {
      // ProductFilters has no isNoindex key, so noindex-flagged products are
      // excluded client-side -- same robots-vs-sitemap rule as STATIC_PATHS.
      if (product.isNoindex) continue;
      entries.push({
        url: `${base}/products/${encodeURIComponent(product.slug)}`,
        lastModified: product.updatedAt,
      });
    }
    total = response.meta?.total ?? entries.length;
    page += 1;
  }
  return entries;
}

async function categoryEntries(base: string): Promise<MetadataRoute.Sitemap> {
  const tree: CategoryNode[] = await sdk.categories.getTree();
  return flattenCategorySlugs(tree).map((slug) => ({
    url: `${base}/products?category=${encodeURIComponent(slug)}`,
  }));
}

async function blogEntries(base: string): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  let page = 1;
  let total = Infinity;
  while (entries.length < total) {
    const response = await sdk.cms.public.listContent('blog', {
      page,
      limit: PAGE_SIZE,
    });
    const posts = response.items ?? [];
    if (posts.length === 0) break;
    for (const post of posts) {
      entries.push({
        url: `${base}/blog/${encodeURIComponent(post.slug)}`,
        // PublicContentEntry has no updatedAt; publishedAt is the best signal.
        lastModified: post.publishedAt ?? undefined,
      });
    }
    total = response.total ?? entries.length;
    page += 1;
  }
  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = config.siteUrl.replace(/\/$/, '');

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: path === '/' ? `${base}/` : `${base}${path}`,
  }));

  // Same resilience rule as the ISR content pages (app/blog/page.tsx): a
  // failed SDK fetch must not 500 the sitemap or break the build, so include
  // whatever succeeded -- worst case, static routes only.
  const results = await Promise.allSettled([
    productEntries(base),
    categoryEntries(base),
    blogEntries(base),
  ]);

  const dynamicEntries = results.flatMap((result, i) => {
    if (result.status === 'fulfilled') return result.value;
    const source = ['products', 'categories', 'blog'][i];
    console.error(`[storefront] sitemap ${source} fetch failed:`, result.reason);
    return [];
  });

  return [...staticEntries, ...dynamicEntries];
}
