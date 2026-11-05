import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicContentEntry, PublicModuleAttachment } from '@aimee.shop/sdk';
import { getCachedModulesByEntity, getCachedPublicContent } from './cms-content';
import { resolveSlot } from './resolve-slot';

vi.mock('server-only', () => ({}));

vi.mock('./cms-content', () => ({
  getCachedPublicContent: vi.fn(),
  getCachedModulesByEntity: vi.fn(),
}));

const getContent = vi.mocked(getCachedPublicContent);
const getModules = vi.mocked(getCachedModulesByEntity);

function entry(overrides: Partial<PublicContentEntry> = {}): PublicContentEntry {
  return {
    id: 'entry-1',
    slug: 'homepage-hero',
    title: 'Hero',
    excerpt: null,
    featuredImageUrl: null,
    author: null,
    authorProfile: null,
    parentId: null,
    path: [],
    level: 0,
    sortOrder: 0,
    publishedAt: null,
    contentTypeKey: null,
    contentTypeVersion: null,
    fields: {},
    seo: { title: null, description: null, keywords: [], canonicalUrl: null },
    tags: [],
    collection: { name: 'Slots', slug: 'slots', urlPrefix: null },
    blocks: [{ type: 'heading', content: { text: 'Hi' }, sortOrder: 0 }],
    ...overrides,
  };
}

function attachment(id: string): PublicModuleAttachment {
  return {
    id,
    entityType: 'product',
    entityId: 'prod-1',
    placement: 'top',
    sortOrder: 0,
    module: {
      id: `mod-${id}`,
      name: id,
      slug: id,
      description: null,
      blocks: [],
    },
  };
}

describe('resolveSlot', () => {
  beforeEach(() => {
    getContent.mockReset();
    getModules.mockReset();
  });

  it('returns a CMS entry hit for homepage-hero', async () => {
    const cmsEntry = entry();
    getContent.mockResolvedValue(cmsEntry);

    const resolved = await resolveSlot('homepage-hero');

    expect(getContent).toHaveBeenCalledWith('page', 'homepage-hero');
    expect(getModules).not.toHaveBeenCalled();
    expect(resolved).toEqual({
      source: 'cms',
      slotId: 'homepage-hero',
      payload: { kind: 'entry', entry: cmsEntry },
    });
  });

  it('returns null when the CMS fetch fails', async () => {
    getContent.mockRejectedValue(new Error('not found'));

    await expect(resolveSlot('homepage-hero')).resolves.toBeNull();
    expect(getModules).not.toHaveBeenCalled();
  });

  it('returns null for an unknown slotId without calling CMS', async () => {
    await expect(resolveSlot('not-a-slot')).resolves.toBeNull();
    expect(getContent).not.toHaveBeenCalled();
    expect(getModules).not.toHaveBeenCalled();
  });

  it('returns product modules for pdp-content when entityId is set', async () => {
    const items = [attachment('a')];
    getModules.mockResolvedValue({ items });

    const resolved = await resolveSlot('pdp-content', { entityId: 'prod-1' });

    expect(getModules).toHaveBeenCalledWith('product', 'prod-1');
    expect(getContent).not.toHaveBeenCalled();
    expect(resolved).toEqual({
      source: 'cms',
      slotId: 'pdp-content',
      payload: { kind: 'modules', items },
    });
  });

  it('returns null for pdp-content without entityId', async () => {
    await expect(resolveSlot('pdp-content')).resolves.toBeNull();
    expect(getModules).not.toHaveBeenCalled();
    expect(getContent).not.toHaveBeenCalled();
  });

  it('skips CMS for cmsFallback none slots', async () => {
    await expect(resolveSlot('homepage-featured')).resolves.toBeNull();
    expect(getContent).not.toHaveBeenCalled();
    expect(getModules).not.toHaveBeenCalled();
  });
});
