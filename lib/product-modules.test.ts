import { describe, it, expect } from 'vitest';
import { groupByPlacement, isModulePlacement, toBlocks } from './product-modules';
import type { PublicModuleAttachment } from '@aimee.shop/sdk';

function attachment(
  placement: string,
  id: string,
  sortOrder = 0,
): PublicModuleAttachment {
  return {
    id,
    entityType: 'product',
    entityId: 'prod-1',
    placement,
    sortOrder,
    module: {
      id: `mod-${id}`,
      name: id,
      slug: id,
      description: null,
      blocks: [],
    },
  };
}

describe('toBlocks', () => {
  it('maps well-formed module blocks and skips junk', () => {
    const blocks = toBlocks([
      { type: 'heading', content: { text: 'Size Guide' }, sortOrder: 1 },
      { type: 'text' },
      null,
      'nope',
    ]);
    expect(blocks).toEqual([
      {
        id: 'module-block-0',
        type: 'heading',
        sortOrder: 1,
        content: { text: 'Size Guide' },
        settings: undefined,
      },
    ]);
  });

  it('returns empty for non-arrays', () => {
    expect(toBlocks(undefined)).toEqual([]);
    expect(toBlocks({})).toEqual([]);
  });
});

describe('groupByPlacement', () => {
  it('keeps top/sidebar/bottom and drops unknown placements', () => {
    const grouped = groupByPlacement([
      attachment('top', 'a'),
      attachment('sidebar', 'b'),
      attachment('bottom', 'c'),
      attachment('hero', 'd'),
    ]);
    expect(grouped.top.map((m) => m.id)).toEqual(['a']);
    expect(grouped.sidebar.map((m) => m.id)).toEqual(['b']);
    expect(grouped.bottom.map((m) => m.id)).toEqual(['c']);
  });

  it('sorts each slot by sortOrder', () => {
    const grouped = groupByPlacement([
      attachment('bottom', 'second', 2),
      attachment('bottom', 'first', 1),
    ]);
    expect(grouped.bottom.map((m) => m.id)).toEqual(['first', 'second']);
  });
});

describe('isModulePlacement', () => {
  it('accepts only the three storefront slots', () => {
    expect(isModulePlacement('top')).toBe(true);
    expect(isModulePlacement('hero')).toBe(false);
  });
});
