import type { PublicModuleAttachment } from '@aimee.shop/sdk';
import type { Block } from '@aimee.shop/blocks';

export type ModulePlacement = 'top' | 'sidebar' | 'bottom';

export function isModulePlacement(value: string): value is ModulePlacement {
  return value === 'top' || value === 'sidebar' || value === 'bottom';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Coerce public module blocks into the shape BlockRenderer expects. */
export function toBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  const blocks: Block[] = [];
  for (const [index, item] of raw.entries()) {
    if (!isRecord(item)) continue;
    const type = item.type;
    const content = item.content;
    if (typeof type !== 'string' || !isRecord(content)) continue;
    const sortOrder = typeof item.sortOrder === 'number' ? item.sortOrder : index;
    const id = typeof item.id === 'string' ? item.id : `module-block-${index}`;
    const settings = isRecord(item.settings) ? item.settings : undefined;
    blocks.push({ id, type, sortOrder, content, settings });
  }
  return blocks;
}

export function groupByPlacement(
  items: PublicModuleAttachment[],
): Record<ModulePlacement, PublicModuleAttachment[]> {
  const groups: Record<ModulePlacement, PublicModuleAttachment[]> = {
    top: [],
    sidebar: [],
    bottom: [],
  };
  for (const item of items) {
    if (isModulePlacement(item.placement)) {
      groups[item.placement].push(item);
    }
  }
  for (const key of ['top', 'sidebar', 'bottom'] as const) {
    groups[key].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return groups;
}
