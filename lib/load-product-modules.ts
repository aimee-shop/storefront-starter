import type { PublicModuleAttachment } from '@aimee.shop/sdk';
import { resolveSlot } from './resolve-slot';

/**
 * Fetch active modules attached to a product. Empty / outage / suppress -> [].
 * Content-slot convention: callers render nothing.
 * Address space: SLOT_MAP['pdp-content'] (placements stay presentation).
 */
export async function loadProductModules(
  productId: string,
): Promise<PublicModuleAttachment[]> {
  const resolved = await resolveSlot('pdp-content', { entityId: productId });
  if (resolved?.source === 'cms' && resolved.payload.kind === 'modules') {
    return resolved.payload.items;
  }
  return [];
}
