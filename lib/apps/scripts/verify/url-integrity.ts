import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SCRIPT_ERROR_CODES, ScriptVerifyError } from '../errors';

const SRI_RE = /^(sha256|sha384|sha512)-([A-Za-z0-9+/]+=*)$/;

export function parseSri(integrity: string): {
  algorithm: 'sha256' | 'sha384' | 'sha512';
  digestBase64: string;
} {
  const m = integrity.trim().match(SRI_RE);
  if (!m || !m[1] || !m[2]) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.INTEGRITY_INVALID,
      `Malformed SRI integrity: ${integrity}`,
    );
  }
  return {
    algorithm: m[1] as 'sha256' | 'sha384' | 'sha512',
    digestBase64: m[2],
  };
}

export function assertValidHttpsScriptUrl(scriptUrl: string): URL {
  let url: URL;
  try {
    url = new URL(scriptUrl);
  } catch {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.URL_INVALID,
      `Script URL is not absolute: ${scriptUrl}`,
    );
  }
  if (url.protocol !== 'https:') {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.URL_INVALID,
      `Script URL must be HTTPS: ${scriptUrl}`,
    );
  }
  if (url.username || url.password) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.URL_INVALID,
      `Script URL must not include credentials: ${scriptUrl}`,
    );
  }
  if (!url.hostname) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.URL_INVALID,
      `Script URL missing hostname: ${scriptUrl}`,
    );
  }
  return url;
}

/**
 * Fixture-only: allow same-origin relative public paths when fixtureMode is on.
 * Production candidates must always be absolute HTTPS.
 */
export function assertScriptUrl(
  scriptUrl: string,
  options: { fixtureMode?: boolean } = {},
): { origin: string; href: string } {
  if (options.fixtureMode && scriptUrl.startsWith('/')) {
    if (scriptUrl.includes('..') || scriptUrl.includes('\\')) {
      throw new ScriptVerifyError(
        SCRIPT_ERROR_CODES.URL_INVALID,
        `Fixture script path must not traverse: ${scriptUrl}`,
      );
    }
    return { origin: 'self', href: scriptUrl };
  }
  const url = assertValidHttpsScriptUrl(scriptUrl);
  return { origin: url.origin, href: url.href };
}

export function assertExecutableOrigins(
  origins: string[],
  scriptOrigin: string,
): string[] {
  if (!Array.isArray(origins) || origins.length === 0) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.SCOPE_INVALID,
      'executableOrigins must be a non-empty array',
    );
  }
  const normalized: string[] = [];
  for (const o of origins) {
    if (typeof o !== 'string' || !o) {
      throw new ScriptVerifyError(
        SCRIPT_ERROR_CODES.SCOPE_INVALID,
        'executableOrigins entries must be non-empty strings',
      );
    }
    if (o === 'self' && scriptOrigin === 'self') {
      normalized.push('self');
      continue;
    }
    let originUrl: URL;
    try {
      originUrl = new URL(o);
    } catch {
      throw new ScriptVerifyError(
        SCRIPT_ERROR_CODES.SCOPE_INVALID,
        `Invalid executable origin: ${o}`,
      );
    }
    if (originUrl.protocol !== 'https:') {
      throw new ScriptVerifyError(
        SCRIPT_ERROR_CODES.SCOPE_INVALID,
        `executableOrigins must be HTTPS: ${o}`,
      );
    }
    if (originUrl.pathname !== '/' || originUrl.search || originUrl.hash) {
      // Accept origin-only or full URL; normalize to origin.
    }
    normalized.push(originUrl.origin);
  }

  if (scriptOrigin !== 'self' && !normalized.includes(scriptOrigin)) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.ORIGIN_MISMATCH,
      `Script origin ${scriptOrigin} not in executableOrigins`,
      { scriptOrigin, executableOrigins: normalized },
    );
  }
  if (scriptOrigin === 'self' && !normalized.includes('self')) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.ORIGIN_MISMATCH,
      'Fixture self script requires executableOrigins to include "self"',
    );
  }
  return [...new Set(normalized)];
}

export function computeFileSri(
  filePath: string,
  algorithm: 'sha256' | 'sha384' | 'sha512' = 'sha384',
): string {
  const buf = readFileSync(filePath);
  const digest = createHash(algorithm).update(buf).digest('base64');
  return `${algorithm}-${digest}`;
}

export function assertLocalIntegrityMatch(
  fixtureRoot: string,
  localScriptPath: string,
  expectedIntegrity: string,
): void {
  const { algorithm, digestBase64 } = parseSri(expectedIntegrity);
  const abs = join(fixtureRoot, localScriptPath);
  let actual: string;
  try {
    actual = computeFileSri(abs, algorithm);
  } catch (err) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.MANIFEST_INVALID,
      `Cannot read local script for integrity check: ${localScriptPath}`,
      { cause: err instanceof Error ? err.message : String(err) },
    );
  }
  const expected = `${algorithm}-${digestBase64}`;
  if (actual !== expected) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.INTEGRITY_MISMATCH,
      `Local script integrity mismatch for ${localScriptPath}`,
      { expected, actual },
    );
  }
}
