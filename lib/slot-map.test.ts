import { describe, it, expect } from 'vitest';
import {
  SLOT_IDS,
  SLOT_MAP,
  slotEntrySource,
  type SlotId,
} from './slot-map';

const EXPECTED_IDS: SlotId[] = [
  'promo-bar',
  'homepage-hero',
  'homepage-featured',
  'homepage-values',
  'homepage-content',
  'homepage-newsletter',
  'pdp-content',
  'pdp-cross-sell',
  'pdp-reviews',
];

describe('SLOT_MAP', () => {
  it('locks the nine v1 slotIds from the content-architecture table', () => {
    expect([...SLOT_IDS].sort()).toEqual([...EXPECTED_IDS].sort());
    expect(new Set(SLOT_IDS).size).toBe(9);
  });

  it('keeps homepage-hero structural (not suppressible)', () => {
    expect(SLOT_MAP['homepage-hero'].suppressible).toBe(false);
    for (const id of SLOT_IDS) {
      if (id === 'homepage-hero') continue;
      expect(SLOT_MAP[id].suppressible).toBe(true);
    }
  });

  it('matches live CMS fetches for entry-backed slots', () => {
    expect(slotEntrySource('promo-bar')).toEqual({
      collection: 'promo-bar',
      slug: 'default',
    });
    expect(SLOT_MAP['promo-bar'].payload).toBe('fields');
    expect(slotEntrySource('homepage-hero')).toEqual({
      collection: 'page',
      slug: 'homepage-hero',
    });
    expect(slotEntrySource('homepage-content')).toEqual({
      collection: 'page',
      slug: 'homepage',
    });
  });

  it('describes pdp-content as product module attachments', () => {
    expect(SLOT_MAP['pdp-content'].cmsFallback).toEqual({
      kind: 'moduleByEntity',
      entityType: 'product',
    });
    expect(() => slotEntrySource('pdp-content')).toThrow(/no entry CMS fallback/);
  });

  it('skips CMS for catalog and template-only slots', () => {
    const noneIds: SlotId[] = [
      'homepage-featured',
      'homepage-values',
      'homepage-newsletter',
      'pdp-cross-sell',
      'pdp-reviews',
    ];
    for (const id of noneIds) {
      expect(SLOT_MAP[id].cmsFallback).toEqual({ kind: 'none' });
      expect(SLOT_MAP[id].payload).toBe('none');
    }
  });
});
