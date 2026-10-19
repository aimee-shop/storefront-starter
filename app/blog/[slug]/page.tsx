import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NotFoundError } from '@aimee.shop/sdk';
import { getCachedPublicContent } from '@/lib/cms-content';
import { fetchBlockProducts } from '@/lib/block-products';
import { StorefrontBlockRenderer } from '@/components/blocks/BlockPage';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Block } from '@aimee.shop/blocks';

interface BlogPostEntry {
  title: string;
  excerpt?: string;
  featuredImageUrl?: string;
  publishedAt?: string;
  author?: string;
  tags: string[];
  blocks?: Block[];
}

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

// ISR: CMS-backed content revalidates every 60s (storefront-content-architecture.md)
export const revalidate = 60;

// No slugs prerendered at build; each post is generated on first request and
// cached (on-demand ISR). Without this, the route would be fully dynamic.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const entry = await getCachedPublicContent('blog', slug);
    return {
      title: entry.title,
      description: entry.excerpt ?? `Read ${entry.title} on our blog.`,
      openGraph: entry.featuredImageUrl
        ? { images: [{ url: entry.featuredImageUrl }] }
        : undefined,
      alternates: { canonical: `/blog/${slug}` },
    };
  } catch {
    return { title: 'Blog Post' };
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  let entry: BlogPostEntry;
  try {
    const response = await getCachedPublicContent('blog', slug);
    entry = response as BlogPostEntry;
  } catch (error) {
    // Only a genuine 404 becomes the not-found page; outages and other
    // failures propagate to the root error boundary.
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  const blocks = entry.blocks ?? [];
  const products = blocks.length ? await fetchBlockProducts(blocks) : undefined;

  return (
    <article className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to Blog
        </Link>

        {/* Header */}
        <header className="space-y-4">
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {entry.title}
          </h1>
          {(entry.author || entry.publishedAt) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {entry.author && <span>{entry.author}</span>}
              {entry.author && entry.publishedAt && (
                <span aria-hidden="true">&middot;</span>
              )}
              {entry.publishedAt && (
                <time dateTime={entry.publishedAt}>
                  {new Date(entry.publishedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
              )}
            </div>
          )}
        </header>

        {/* Featured image */}
        {entry.featuredImageUrl && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-lg">
            <Image
              src={entry.featuredImageUrl}
              alt={entry.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
        )}

        <Separator className="my-8" />

        {/* Content */}
        {blocks.length > 0 ? (
          <div className="prose-container">
            <StorefrontBlockRenderer blocks={blocks} products={products} />
          </div>
        ) : entry.excerpt ? (
          <p className="text-lg text-muted-foreground">{entry.excerpt}</p>
        ) : null}

        <Separator className="my-8" />

        {/* Footer nav */}
        <div className="text-center">
          <Link
            href="/blog"
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            View all posts
          </Link>
        </div>
      </div>
    </article>
  );
}
