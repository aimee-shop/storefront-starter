import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseScriptCspOrigins } from './build-csp';

/**
 * COMMITTED snapshot (not .generated/) so Edge middleware can import it
 * statically -- middleware has no node:fs and .generated/ is gitignored.
 * apps:verify rewrites it only when the origin set changes; CI fails on a
 * dirty diff so the snapshot can never drift from the verified registry.
 */
export const DEFAULT_CSP_ORIGINS_RELATIVE_PATH =
  'lib/apps/csp/app-script-origins.generated.json';

export interface ScriptCspOriginsFile {
  schemaVersion: '1';
  origins: string[];
}

/**
 * Read verified CSP executable origins for privileged scripts (Node callers).
 * Missing/corrupt file => empty list (fail closed: only 'self' scripts would apply).
 */
export function loadScriptCspOrigins(
  cwd: string = process.cwd(),
  relativePath: string = DEFAULT_CSP_ORIGINS_RELATIVE_PATH,
): string[] {
  try {
    const raw = readFileSync(join(cwd, relativePath), 'utf8');
    return parseScriptCspOrigins(JSON.parse(raw));
  } catch {
    return [];
  }
}
