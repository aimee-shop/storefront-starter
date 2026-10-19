import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export interface BlogEntry {
  slug: string;
  title: string;
  excerpt?: string;
  featuredImageUrl?: string;
  publishedAt?: string;
  author?: string;
  tags: string[];
}

interface BlogCardProps {
  entry: BlogEntry;
}

export function BlogCard({ entry }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${entry.slug}`}
      prefetch={false}
      className="group block overflow-hidden rounded-xl border border-transparent transition-all duration-200 hover:border-border hover:shadow-md"
    >
      <div className="relative overflow-hidden bg-muted">
        <div className="aspect-[16/10]">
          {entry.featuredImageUrl ? (
            <Image
              src={entry.featuredImageUrl}
              alt={entry.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/40">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
          )}
        </div>
      </div>
      <div className="p-5">
        {entry.tags.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {entry.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <h3 className="line-clamp-2 font-semibold leading-snug transition-colors group-hover:text-[var(--color-primary)]">
          {entry.title}
        </h3>
        {entry.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{entry.excerpt}</p>
        )}
        {(entry.author || entry.publishedAt) && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            {entry.author && <span>{entry.author}</span>}
            {entry.author && entry.publishedAt && (
              <span aria-hidden="true">&middot;</span>
            )}
            {entry.publishedAt && (
              <time dateTime={entry.publishedAt}>{formatDate(entry.publishedAt)}</time>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
