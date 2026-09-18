import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { VerifiedMountRegistry } from '../types';
import {
  DEFAULT_CSP_ORIGINS_RELATIVE_PATH,
  type ScriptCspOriginsFile,
} from '../csp/script-origins';

export const DEFAULT_REGISTRY_RELATIVE_PATH = '.generated/app-mounts.json';

export function writeRegistry(
  registry: VerifiedMountRegistry,
  cwd: string = process.cwd(),
  relativePath: string = DEFAULT_REGISTRY_RELATIVE_PATH,
): string {
  const abs = join(cwd, relativePath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(registry, null, 2) + '\n', 'utf8');
  writeScriptCspOrigins(registry, cwd);
  return abs;
}

/**
 * Write unique HTTPS origins from verified scripts for middleware CSP.
 * The target is a COMMITTED snapshot (Edge middleware imports it statically),
 * so the payload is deterministic and only rewritten when it changes.
 */
export function writeScriptCspOrigins(
  registry: VerifiedMountRegistry,
  cwd: string = process.cwd(),
  relativePath: string = DEFAULT_CSP_ORIGINS_RELATIVE_PATH,
): string {
  const originSet = new Set<string>();
  for (const script of registry.scripts ?? []) {
    for (const o of script.executableOrigins) {
      if (o && o !== 'self') originSet.add(o);
    }
  }
  const payload: ScriptCspOriginsFile = {
    schemaVersion: '1',
    origins: [...originSet].sort(),
  };
  const abs = join(cwd, relativePath);
  const next = JSON.stringify(payload, null, 2) + '\n';
  let current: string | null = null;
  try {
    current = readFileSync(abs, 'utf8');
  } catch {
    current = null;
  }
  if (current !== next) {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, next, 'utf8');
  }
  return abs;
}
