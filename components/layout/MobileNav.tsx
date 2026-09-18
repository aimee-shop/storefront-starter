'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { RegionPickerList } from './RegionPicker';
import type { StorefrontMarketOption } from '@/lib/market-types';

interface MobileNavProps {
  links: { label: string; href: string; prefetch?: boolean }[];
  storeName?: string;
  markets?: StorefrontMarketOption[];
}

export function MobileNav({
  links,
  storeName = 'Acme Store',
  markets = [],
}: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-muted lg:hidden">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle className="text-left">{storeName}</SheetTitle>
        </SheetHeader>
        <Separator className="my-4" />
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={link.prefetch}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Separator className="my-2" />
          <Link
            href="/account"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Account
          </Link>
          {markets.length >= 2 && (
            <>
              <Separator className="my-2" />
              <RegionPickerList
                markets={markets}
                onSelected={() => setOpen(false)}
              />
            </>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
