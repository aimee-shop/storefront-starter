import type { PublicModuleAttachment } from '@aimee.shop/sdk';
import { fetchBlockProducts } from '@/lib/block-products';
import { toBlocks, type ModulePlacement } from '@/lib/product-modules';
import { StorefrontBlockRenderer } from '@/components/blocks/BlockPage';

const SLOT_LABEL: Record<ModulePlacement, string> = {
  top: 'Product highlights',
  sidebar: 'Product extras',
  bottom: 'More about this product',
};

interface ProductAttachedModulesProps {
  items: PublicModuleAttachment[];
  placement: ModulePlacement;
  className?: string;
}

/**
 * Render attached CMS modules for one PDP placement.
 * Empty items, empty blocks, or per-module fetch failures -> omit that module.
 */
export async function ProductAttachedModules({
  items,
  placement,
  className,
}: ProductAttachedModulesProps) {
  if (items.length === 0) return null;

  const rendered = await Promise.all(
    items.map(async (item) => {
      try {
        const blocks = toBlocks(item.module.blocks);
        if (!blocks.length) return null;
        const products = await fetchBlockProducts(blocks);
        return (
          <StorefrontBlockRenderer
            key={item.id}
            blocks={blocks}
            products={products}
          />
        );
      } catch {
        return null;
      }
    }),
  );
  const sections = rendered.filter((node) => node !== null);
  if (sections.length === 0) return null;

  const Tag = placement === 'sidebar' ? 'aside' : 'section';
  return (
    <Tag className={className} aria-label={SLOT_LABEL[placement]}>
      {sections}
    </Tag>
  );
}
