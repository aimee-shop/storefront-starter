import Image from 'next/image';
import Link from 'next/link';
import { MobileNav } from './MobileNav';
import { CartIcon } from './CartIcon';
import { RegionPicker } from './RegionPicker';
import type { StorefrontMarketOption } from '@/lib/market-types';

const navLinks: { label: string; href: string; prefetch?: boolean }[] = [
  // Shop is a primary CTA -- omit prefetch (Next default / auto).
  // Secondary nav disables prefetch to avoid an RSC storm on first paint.
  { label: 'Shop', href: '/products' },
  { label: 'Blog', href: '/blog', prefetch: false },
  { label: 'About', href: '/about', prefetch: false },
];

interface HeaderProps {
  storeName?: string;
  logoUrl?: string;
  logoAlt?: string;
  markets?: StorefrontMarketOption[];
}

export function Header({
  storeName = 'Acme Store',
  logoUrl,
  logoAlt,
  markets = [],
}: HeaderProps) {
  const isDemoLogo = logoUrl === '/brand/aimee-logo-horizontal-onlight.svg';

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Mobile nav + Logo */}
        <div className="flex items-center gap-3">
          <MobileNav links={navLinks} storeName={storeName} markets={markets} />
          <Link href="/" className="flex items-center gap-2">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={logoAlt || storeName}
                width={isDemoLogo ? 133 : 120}
                height={isDemoLogo ? 48 : 32}
                className={isDemoLogo ? 'h-12 w-auto' : 'h-8 w-auto'}
                priority
              />
            ) : (
              <span className="text-lg font-semibold tracking-tight">
                {storeName}
              </span>
            )}
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={link.prefetch}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: region + cart + account */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Icon-only on small screens; labeled from sm up. MobileNav also lists regions. */}
          <RegionPicker markets={markets} compact className="sm:hidden" />
          <RegionPicker markets={markets} className="hidden sm:inline-flex" />
          <Link
            href="/account"
            prefetch={false}
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Account
          </Link>
          <CartIcon />
        </div>
      </div>
    </header>
  );
}
