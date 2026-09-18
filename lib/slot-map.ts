/**
 * Locked v1 storefront slot map.
 *
 * Source of truth: requirements/storefront-content-architecture.md section 3.2
 * (aimee-planning#120). SlotDefinition seeding in core-api must use these
 * slotIds. Do not invent a second list.
 *
 * Runtime helper: lib/resolve-slot.ts (starter#33, CMS-only until DEP-14).
 */

export const SLOT_SURFACES = ['chrome', 'homepage', 'pdp'] as const;
export type SlotSurface = (typeof SLOT_SURFACES)[number];

export const SLOT_CONTENT_CLASSES = [
  'chrome',
  'editorial',
  'catalog',
  'ugc',
] as const;
export type SlotContentClass = (typeof SLOT_CONTENT_CLASSES)[number];

export const SLOT_PAYLOADS = ['blocks', 'fields', 'none'] as const;
export type SlotPayload = (typeof SLOT_PAYLOADS)[number];

export type CmsFallback =
  | { kind: 'none' }
  | { kind: 'entry'; collection: string; slug: string }
  | { kind: 'moduleByEntity'; entityType: 'product' };

export type SlotDefinitionSeed = {
  slotId: string;
  surface: SlotSurface;
  suppressible: boolean;
  contentClass: SlotContentClass;
  payload: SlotPayload;
  /** Experience API template key; null when the slot has no generated card yet. */
  experienceTemplate: string | null;
  cmsFallback: CmsFallback;
};

export const SLOT_MAP = {
  'promo-bar': {
    slotId: 'promo-bar',
    surface: 'chrome',
    suppressible: true,
    contentClass: 'chrome',
    payload: 'fields',
    experienceTemplate: null,
    cmsFallback: { kind: 'entry', collection: 'promo-bar', slug: 'default' },
  },
  'homepage-hero': {
    slotId: 'homepage-hero',
    surface: 'homepage',
    suppressible: false,
    contentClass: 'editorial',
    payload: 'blocks',
    experienceTemplate: 'homepage_hero',
    cmsFallback: { kind: 'entry', collection: 'page', slug: 'homepage-hero' },
  },
  'homepage-featured': {
    slotId: 'homepage-featured',
    surface: 'homepage',
    suppressible: true,
    contentClass: 'catalog',
    payload: 'none',
    experienceTemplate: 'homepage_featured_products',
    cmsFallback: { kind: 'none' },
  },
  'homepage-values': {
    slotId: 'homepage-values',
    surface: 'homepage',
    suppressible: true,
    contentClass: 'editorial',
    payload: 'none',
    experienceTemplate: 'homepage_value_props',
    cmsFallback: { kind: 'none' },
  },
  'homepage-content': {
    slotId: 'homepage-content',
    surface: 'homepage',
    suppressible: true,
    contentClass: 'editorial',
    payload: 'blocks',
    experienceTemplate: 'homepage_content',
    cmsFallback: { kind: 'entry', collection: 'page', slug: 'homepage' },
  },
  'homepage-newsletter': {
    slotId: 'homepage-newsletter',
    surface: 'homepage',
    suppressible: true,
    contentClass: 'editorial',
    payload: 'none',
    experienceTemplate: null,
    cmsFallback: { kind: 'none' },
  },
  'pdp-content': {
    slotId: 'pdp-content',
    surface: 'pdp',
    suppressible: true,
    contentClass: 'editorial',
    payload: 'blocks',
    experienceTemplate: 'pdp_content',
    cmsFallback: { kind: 'moduleByEntity', entityType: 'product' },
  },
  'pdp-cross-sell': {
    slotId: 'pdp-cross-sell',
    surface: 'pdp',
    suppressible: true,
    contentClass: 'catalog',
    payload: 'none',
    experienceTemplate: 'pdp_cross_sell',
    cmsFallback: { kind: 'none' },
  },
  'pdp-reviews': {
    slotId: 'pdp-reviews',
    surface: 'pdp',
    suppressible: true,
    contentClass: 'ugc',
    payload: 'none',
    experienceTemplate: 'pdp_reviews',
    cmsFallback: { kind: 'none' },
  },
} as const satisfies Record<string, SlotDefinitionSeed>;

export type SlotId = keyof typeof SLOT_MAP;

export const SLOT_IDS = Object.keys(SLOT_MAP) as SlotId[];

export function slotEntrySource(
  slotId: SlotId,
): { collection: string; slug: string } {
  const fallback = SLOT_MAP[slotId].cmsFallback;
  if (fallback.kind !== 'entry') {
    throw new Error(`slot ${slotId} has no entry CMS fallback`);
  }
  return { collection: fallback.collection, slug: fallback.slug };
}
