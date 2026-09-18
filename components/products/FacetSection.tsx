'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface FacetSectionProps {
  field: string;
  label: string;
  options: string[];
  counts?: Map<string, number>;
  selected: string[];
}

export function FacetSection({ field, label, options, counts, selected }: FacetSectionProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(selected.length > 0);

  function toggleValue(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll(field);

    params.delete(field);
    if (current.includes(value)) {
      for (const v of current) {
        if (v !== value) params.append(field, v);
      }
    } else {
      for (const v of current) params.append(field, v);
      params.append(field, value);
    }
    params.delete('page');
    router.push(`/products?${params.toString()}`);
  }

  if (options.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {label}
        <svg
          className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="space-y-0.5 pb-1">
          {options.map((value) => {
            const isSelected = selected.includes(value);
            const count = counts?.get(value);
            const isZero = counts !== undefined && (count === undefined || count === 0);

            return (
              <button
                key={value}
                onClick={() => toggleValue(value)}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                  isSelected
                    ? 'bg-accent font-medium text-accent-foreground'
                    : isZero
                      ? 'text-muted-foreground/50'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]',
                      isSelected
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {isSelected && '\u2713'}
                  </span>
                  {value}
                </span>
                {count !== undefined && (
                  <span className="text-xs text-muted-foreground">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
