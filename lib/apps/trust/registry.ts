import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TrustKey, TrustRegistry } from '../types';

export interface LoadTrustRegistryOptions {
  /**
   * When true, allow the committed fixture trust registry.
   * Production/sdk verifies must set APPS_TRUST_REGISTRY_PATH instead.
   */
  allowFixtureTrust?: boolean;
}

/**
 * Load publisher trust keys. Resolution order:
 * 1. APPS_TRUST_REGISTRY_PATH env (JSON TrustRegistry)
 * 2. fixtures/apps/trust/registry.json when allowFixtureTrust is true
 */
export function loadTrustRegistry(
  cwd: string = process.cwd(),
  options: LoadTrustRegistryOptions = {},
): TrustRegistry {
  const fromEnv = process.env.APPS_TRUST_REGISTRY_PATH;
  if (fromEnv) {
    return parseTrustRegistry(readFileSync(fromEnv, 'utf8'));
  }

  const allowFixture =
    options.allowFixtureTrust === true ||
    process.env.APPS_ALLOW_FIXTURE_TRUST === '1';

  if (!allowFixture) {
    throw new Error(
      'APPS_TRUST_REGISTRY_PATH is required for non-fixture package verification. ' +
        'Set APPS_ALLOW_FIXTURE_TRUST=1 only for local/fixture gates.',
    );
  }

  const fixturePath = join(cwd, 'fixtures/apps/trust/registry.json');
  return parseTrustRegistry(readFileSync(fixturePath, 'utf8'));
}

export function parseTrustRegistry(raw: string): TrustRegistry {
  const parsed = JSON.parse(raw) as TrustRegistry;
  if (!parsed || !Array.isArray(parsed.keys)) {
    throw new Error('Trust registry must contain a keys array');
  }
  for (const key of parsed.keys) {
    if (key.algorithm !== 'ed25519' || !key.keyId || !key.publicKeyPem) {
      throw new Error(`Invalid trust key entry: ${key?.keyId ?? '(missing)'}`);
    }
  }
  return parsed;
}

export function findTrustKey(
  registry: TrustRegistry,
  keyId: string,
): TrustKey | undefined {
  return registry.keys.find((k) => k.keyId === keyId);
}
