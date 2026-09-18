import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { VerifiedMountRegistry } from '../types';
import { DEFAULT_REGISTRY_RELATIVE_PATH } from './generate';

/**
 * Load the build-time verified mount registry.
 * Missing file => empty packages (no extensions mounted). Never throws for
 * missing registry so core storefront rendering stays available.
 */
export function loadVerifiedMountRegistry(
  cwd: string = process.cwd(),
  relativePath: string = DEFAULT_REGISTRY_RELATIVE_PATH,
): VerifiedMountRegistry | null {
  try {
    const raw = readFileSync(join(cwd, relativePath), 'utf8');
    const parsed = JSON.parse(raw) as VerifiedMountRegistry;
    if (parsed.schemaVersion !== '1' || !Array.isArray(parsed.packages)) {
      return null;
    }
    // Backward compatible: older registries omit scripts.
    if (parsed.scripts !== undefined && !Array.isArray(parsed.scripts)) {
      return null;
    }
    if (!parsed.scripts) {
      parsed.scripts = [];
    }
    return parsed;
  } catch {
    return null;
  }
}
