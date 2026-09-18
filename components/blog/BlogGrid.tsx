import { BlogCard, type BlogEntry } from './BlogCard';

interface BlogGridProps {
  entries: BlogEntry[];
}

export function BlogGrid({ entries }: BlogGridProps) {
  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No blog posts yet. Check back soon.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <BlogCard key={entry.slug} entry={entry} />
      ))}
    </div>
  );
}
