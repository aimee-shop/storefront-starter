import { fetchBlockProducts } from '@/lib/block-products';
import { resolveSlot } from '@/lib/resolve-slot';
import { StorefrontBlockRenderer } from '@/components/blocks/BlockPage';
import type { Block } from '@aimee.shop/blocks';
import { toBlocks } from '@/lib/product-modules';

export async function HomepageCmsContent() {
  const resolved = await resolveSlot('homepage-content');
  if (resolved?.source === 'suppress') {
    return null;
  }

  let blocks: Block[] | null = null;
  if (resolved?.source === 'experience') {
    blocks = resolved.blocks;
  } else if (resolved?.source === 'cms' && resolved.payload.kind === 'entry') {
    blocks = toBlocks(resolved.payload.entry.blocks);
  }

  if (!blocks?.length) {
    return null;
  }

  const products = await fetchBlockProducts(blocks);

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <StorefrontBlockRenderer blocks={blocks} products={products} />
      </div>
    </section>
  );
}
