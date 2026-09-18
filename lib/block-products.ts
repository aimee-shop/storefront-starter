import type { Block, ProductData } from '@aimee.shop/blocks';
import { sdk } from './sdk';

function collectProductIds(blocks: Block[]): string[] {
  const ids = new Set<string>();
  for (const block of blocks) {
    if (block.type === 'product_card') {
      const id = block.content.productId;
      if (typeof id === 'string' && id) ids.add(id);
    } else if (block.type === 'product_grid') {
      const list = block.content.productIds;
      if (Array.isArray(list)) {
        for (const id of list) {
          if (typeof id === 'string' && id) ids.add(id);
        }
      }
    }
  }
  return [...ids];
}

/**
 * Resolve the product data referenced by product_card / product_grid blocks
 * into the products map @aimee.shop/blocks BlockRenderer expects.
 *
 * Products that fail to load are simply omitted: the blocks library renders
 * its "Product unavailable" placeholder for unresolved ids, so a deleted or
 * disabled product never takes down the page.
 */
export async function fetchBlockProducts(
  blocks: Block[],
): Promise<Record<string, ProductData> | undefined> {
  const ids = collectProductIds(blocks);
  if (ids.length === 0) {
    return undefined;
  }

  const results = await Promise.allSettled(
    ids.map((id) => sdk.products.get(id, { include: ['priceRange', 'primaryImage'] })),
  );

  const products: Record<string, ProductData> = {};
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const product = result.value;
    products[product.id] = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.priceRange ? Number(product.priceRange.min) : undefined,
      currency: product.priceRange?.currency,
      images: product.primaryImage
        ? [{ url: product.primaryImage.url, alt: product.primaryImage.altText ?? undefined }]
        : undefined,
    };
  }
  return products;
}
