import { describe, expect, it, vi } from 'vitest';
import type { Block } from '@aimee.shop/blocks';

const { get } = vi.hoisted(() => ({
  get: vi.fn(async (id: string) => ({
  id,
  name: `Product ${id}`,
  slug: id,
  priceRange: { min: '10', max: '10', currency: 'EUR' },
  primaryImage: null,
  })),
}));

vi.mock('./sdk', () => ({ sdk: { products: { get } } }));

import { fetchBlockProducts } from './block-products';

describe('fetchBlockProducts', () => {
  it('resolves products nested inside columns blocks', async () => {
    const blocks: Block[] = [
      {
        id: 'cols',
        type: 'columns',
        sortOrder: 0,
        content: {
          columns: [
            {
              width: 'auto',
              blocks: [
                {
                  id: 'pc',
                  type: 'product_card',
                  sortOrder: 0,
                  content: { productId: 'p-nested' },
                },
              ],
            },
          ],
        },
      },
    ];

    const products = await fetchBlockProducts(blocks);
    expect(get).toHaveBeenCalledWith('p-nested', expect.anything());
    expect(products?.['p-nested']?.currency).toBe('EUR');
  });
});
