'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  children?: CategoryNode[];
}

interface CategoryTreeProps {
  categories: CategoryNode[];
}

export function CategoryTree({ categories }: CategoryTreeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') ?? '';

  function selectCategory(slug: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug && slug !== currentCategory) {
      params.set('category', slug);
    } else {
      params.delete('category');
    }
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  }

  if (categories.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Categories
      </h3>
      <div className="space-y-0.5">
        <button
          onClick={() => selectCategory(null)}
          className={cn(
            'block w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
            !currentCategory
              ? 'bg-accent font-medium text-accent-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          All Products
        </button>
        {categories.map((cat) => (
          <CategoryItem
            key={cat.id}
            category={cat}
            currentCategory={currentCategory}
            onSelect={selectCategory}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryItem({
  category,
  currentCategory,
  onSelect,
  depth,
}: {
  category: CategoryNode;
  currentCategory: string;
  onSelect: (slug: string) => void;
  depth: number;
}) {
  const isActive = category.slug === currentCategory;
  const hasChildren = category.children && category.children.length > 0;

  return (
    <>
      <button
        onClick={() => onSelect(category.slug)}
        className={cn(
          'block w-full rounded-md py-1.5 text-left text-sm transition-colors',
          isActive
            ? 'bg-accent font-medium text-accent-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
        style={{ paddingLeft: `${0.625 + depth * 0.75}rem`, paddingRight: '0.625rem' }}
      >
        {category.name}
      </button>
      {hasChildren &&
        category.children!.map((child) => (
          <CategoryItem
            key={child.id}
            category={child}
            currentCategory={currentCategory}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
    </>
  );
}
