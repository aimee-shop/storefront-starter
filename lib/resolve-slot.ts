import 'server-only';

import type { Block } from '@aimee.shop/blocks';
import type {
  PublicContentEntry,
  PublicModuleAttachment,
} from '@aimee.shop/sdk';
import { getCachedModulesByEntity, getCachedPublicContent } from './cms-content';
import { SLOT_MAP, type SlotId } from './slot-map';

export type SlotContext = {
  /** Entity id for moduleByEntity slots (product id on pdp-content). */
  entityId?: string;
};

export type ResolvedSlot =
  | { source: 'suppress' }
  | { source: 'experience'; blocks: Block[] }
  | {
      source: 'cms';
      slotId: SlotId;
      payload:
        | { kind: 'entry'; entry: PublicContentEntry }
        | { kind: 'modules'; items: PublicModuleAttachment[] };
    };

function isSlotId(value: string): value is SlotId {
  return Object.prototype.hasOwnProperty.call(SLOT_MAP, value);
}

/**
 * Experience serving waits on DEP-14 (experience-api does not exist).
 * Always skip so CMS-only v1 callers keep working. Later: suppress | card.
 */
async function tryExperienceSlot(
  _slotId: SlotId,
  _context?: SlotContext,
): Promise<{ kind: 'suppress' } | { kind: 'card'; blocks: Block[] } | undefined> {
  return undefined;
}

/**
 * CMS-only slot fallthrough (starter#33). Caller supplies the template React
 * node. Miss / outage / unknown slotId / cmsFallback none -> null.
 */
export async function resolveSlot(
  slotId: string,
  context?: SlotContext,
): Promise<ResolvedSlot | null> {
  if (!isSlotId(slotId)) {
    return null;
  }

  const definition = SLOT_MAP[slotId];
  const experience = await tryExperienceSlot(slotId, context);
  if (experience?.kind === 'suppress') {
    if (definition.suppressible) {
      return { source: 'suppress' };
    }
  } else if (experience?.kind === 'card') {
    return { source: 'experience', blocks: experience.blocks };
  }

  const fallback = definition.cmsFallback;
  if (fallback.kind === 'none') {
    return null;
  }

  try {
    if (fallback.kind === 'entry') {
      const entry = await getCachedPublicContent(
        fallback.collection,
        fallback.slug,
      );
      return {
        source: 'cms',
        slotId,
        payload: { kind: 'entry', entry },
      };
    }

    const entityId = context?.entityId;
    if (!entityId) {
      return null;
    }

    const { items } = await getCachedModulesByEntity(
      fallback.entityType,
      entityId,
    );
    return {
      source: 'cms',
      slotId,
      payload: { kind: 'modules', items },
    };
  } catch {
    // Intentional slot fallback (storefront-content-architecture.md):
    // miss / outage -- caller uses template or hides.
    return null;
  }
}
