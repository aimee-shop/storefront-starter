import Link from 'next/link';
import { fetchBlockProducts } from '@/lib/block-products';
import { resolveSlot } from '@/lib/resolve-slot';
import { StorefrontBlockRenderer } from '@/components/blocks/BlockPage';
import type { Block } from '@aimee.shop/blocks';
import { toBlocks } from '@/lib/product-modules';

export async function HeroBanner() {
  const resolved = await resolveSlot('homepage-hero');
  let cmsBlocks: Block[] | null = null;
  if (resolved?.source === 'experience') {
    cmsBlocks = resolved.blocks;
  } else if (resolved?.source === 'cms' && resolved.payload.kind === 'entry') {
    cmsBlocks = toBlocks(resolved.payload.entry.blocks);
  }

  if (cmsBlocks?.length) {
    const products = await fetchBlockProducts(cmsBlocks);
    return (
      <section>
        <StorefrontBlockRenderer blocks={cmsBlocks} products={products} />
      </section>
    );
  }

  // Static fallback hero
  return (
    <section className="bg-[var(--color-dark)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8 lg:py-40">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Engineered for
          <br />
          modern living
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-300 sm:text-xl">
          Premium products designed with precision, built to last, and delivered
          with care. Experience the difference quality makes.
        </p>
        <div className="mt-8">
          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-8 text-sm font-medium text-[var(--color-dark)] transition-colors hover:bg-gray-100"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
}
