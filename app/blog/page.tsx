import type { Metadata } from 'next';
import { sdk } from '@/lib/sdk';
import { BlogGrid } from '@/components/blog/BlogGrid';
import type { PublicContentEntry } from '@aimee.shop/sdk';
import type { BlogEntry } from '@/components/blog/BlogCard';

export const metadata: Metadata = {
  alternates: { canonical: '/blog' },
  title: 'Blog',
  description: 'Stories, guides, and updates from our team.',
};

// ISR: CMS-backed content revalidates every 60s (storefront-content-architecture.md)
export const revalidate = 60;

export default async function BlogPage() {
  // This route is ISR (statically prerendered), so a fetch failure renders an
  // explicit, visible failure state instead of throwing: the build must
  // succeed without a reachable backend, and at runtime a failed background
  // revalidation keeps serving the last good page. An empty collection (as
  // opposed to an outage) still renders the BlogGrid empty state.
  let entries: BlogEntry[] = [];
  let loadFailed = false;

  try {
    const response = await sdk.cms.public.listContent('blog');
    entries = (response.items ?? []).map(toBlogEntry);
  } catch (error) {
    console.error('[storefront] blog list fetch failed:', error);
    loadFailed = true;
  }

  return (
    <div className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Blog</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Stories, guides, and updates from our team.
          </p>
        </div>
        {loadFailed ? <BlogLoadError /> : <BlogGrid entries={entries} />}
      </div>
    </div>
  );
}

function toBlogEntry(entry: PublicContentEntry): BlogEntry {
  return {
    slug: entry.slug,
    title: entry.title,
    excerpt: entry.excerpt ?? undefined,
    featuredImageUrl: entry.featuredImageUrl ?? undefined,
    publishedAt: entry.publishedAt || undefined,
    author: entry.author ?? undefined,
    tags: entry.tags,
  };
}

function BlogLoadError() {
  return (
    <div className="mx-auto max-w-md rounded-lg border p-8 text-center">
      <h2 className="text-2xl font-bold tracking-tight">
        Posts could not be loaded
      </h2>
      <p className="mt-2 text-muted-foreground">
        Something went wrong while loading the blog. Please try again in a
        moment.
      </p>
    </div>
  );
}
