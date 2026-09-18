import { SCRIPT_ERROR_CODES, ScriptVerifyError } from '../errors';
import { loadPlatformScriptPolicy } from '../policy/platform-policy';
import type {
  ResolvedScriptCandidate,
  ScriptVerifyResult,
  VerifiedScript,
} from '../types';
import {
  assertExecutableOrigins,
  assertLocalIntegrityMatch,
  assertScriptUrl,
  parseSri,
} from './url-integrity';

export interface ScriptVerifyOptions {
  /** When true, allow fixture-local relative script paths and fixture gate. */
  fixtureMode?: boolean;
  /**
   * Deploy-time platform origin allowlist (defense in depth behind the
   * certified resolve layer). When provided outside fixture mode, executable
   * origins are intersected with it and the script origin must survive.
   */
  platformAllowedOrigins?: string[];
}

function assertConsent(state: ResolvedScriptCandidate['merchantConsentState']): void {
  if (state !== 'granted') {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.CONSENT_REQUIRED,
      `Merchant consent not granted (state=${state})`,
    );
  }
}

function assertHealth(
  status: ResolvedScriptCandidate['manifest']['healthStatus'],
): 'healthy' | 'unknown' {
  const s = status ?? 'unknown';
  if (s === 'unhealthy' || s === 'degraded') {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.HEALTH_BLOCKED,
      `Script health blocked (status=${s})`,
    );
  }
  return s === 'healthy' ? 'healthy' : 'unknown';
}

function assertBudget(maxLoadMs: unknown): number {
  if (typeof maxLoadMs !== 'number' || !Number.isFinite(maxLoadMs)) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.BUDGET_INVALID,
      'budgets.maxLoadMs must be a finite number',
    );
  }
  if (maxLoadMs < 100 || maxLoadMs > 30_000) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.BUDGET_INVALID,
      `budgets.maxLoadMs out of range (100-30000): ${maxLoadMs}`,
    );
  }
  return maxLoadMs;
}

function assertPageScope(pageScope: ResolvedScriptCandidate['manifest']['pageScope']): {
  allow?: string[];
  deny?: string[];
} {
  if (!pageScope || typeof pageScope !== 'object') {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.SCOPE_INVALID,
      'pageScope is required',
    );
  }
  const allow = pageScope.allow;
  const deny = pageScope.deny;
  if (allow !== undefined && !Array.isArray(allow)) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.SCOPE_INVALID,
      'pageScope.allow must be an array when present',
    );
  }
  if (deny !== undefined && !Array.isArray(deny)) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.SCOPE_INVALID,
      'pageScope.deny must be an array when present',
    );
  }
  return {
    allow: allow?.map(String),
    deny: deny?.map(String),
  };
}

function assertManifestShape(candidate: ResolvedScriptCandidate): void {
  const m = candidate.manifest;
  if (!m || typeof m !== 'object') {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.MANIFEST_INVALID,
      'Script manifest missing',
    );
  }
  if (!m.name || !m.version || !m.scriptUrl || !m.integrity || !m.consentCategory) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.MANIFEST_INVALID,
      'Script manifest requires name, version, scriptUrl, integrity, consentCategory',
    );
  }
  if (!m.budgets) {
    throw new ScriptVerifyError(
      SCRIPT_ERROR_CODES.BUDGET_INVALID,
      'Script manifest requires budgets',
    );
  }
}

/**
 * Ordered fail-closed verification for one privileged remote script mount.
 * Does not execute or eval script content.
 */
export function verifyScript(
  candidate: ResolvedScriptCandidate,
  options: ScriptVerifyOptions = {},
): ScriptVerifyResult {
  try {
    // Explicit options.fixtureMode=false wins over candidate flag (tests + prod).
    const fixtureMode =
      options.fixtureMode === false
        ? false
        : options.fixtureMode === true || candidate.fixtureMode === true;
    // Fixture mode skips the platform origin allowlist -- never in production.
    if (fixtureMode && process.env.NODE_ENV === 'production') {
      throw new ScriptVerifyError(
        SCRIPT_ERROR_CODES.CERTIFICATION,
        'fixtureMode is not allowed when NODE_ENV=production',
      );
    }
    assertManifestShape(candidate);
    const m = candidate.manifest;

    assertConsent(candidate.merchantConsentState);
    const healthStatus = assertHealth(m.healthStatus);
    const pageScope = assertPageScope(m.pageScope);
    const maxLoadMs = assertBudget(m.budgets.maxLoadMs);

    // Integrity format first (fail closed before any URL normalization side effects).
    parseSri(m.integrity);

    const { origin, href } = assertScriptUrl(m.scriptUrl, { fixtureMode });
    if (!fixtureMode && origin === 'self') {
      throw new ScriptVerifyError(
        SCRIPT_ERROR_CODES.CERTIFICATION,
        'Relative script URLs are only allowed in fixture mode',
      );
    }

    let executableOrigins = assertExecutableOrigins(
      m.executableOrigins,
      origin,
    );
    // Outside fixture mode the platform allowlist always applies; an omitted
    // option falls back to the env-pinned policy so this layer cannot be
    // accidentally bypassed (fail closed, not fail open).
    const platformAllowedOrigins =
      options.platformAllowedOrigins ??
      (fixtureMode ? undefined : loadPlatformScriptPolicy().allowedOrigins);
    if (!fixtureMode && platformAllowedOrigins) {
      const allowed = new Set(platformAllowedOrigins);
      executableOrigins = executableOrigins.filter((o) => allowed.has(o));
      if (!executableOrigins.includes(origin)) {
        throw new ScriptVerifyError(
          SCRIPT_ERROR_CODES.ORIGIN_MISMATCH,
          `Script origin ${origin} not in platform allowlist (APPS_SCRIPT_ALLOWED_ORIGINS)`,
          { scriptOrigin: origin },
        );
      }
    }

    if (m.localScriptPath) {
      if (!fixtureMode || !candidate.fixtureRoot) {
        throw new ScriptVerifyError(
          SCRIPT_ERROR_CODES.CERTIFICATION,
          'localScriptPath integrity recompute requires fixture mode and fixtureRoot',
        );
      }
      assertLocalIntegrityMatch(
        candidate.fixtureRoot,
        m.localScriptPath,
        m.integrity,
      );
    }

    let rollback: VerifiedScript['rollback'];
    if (m.rollback) {
      parseSri(m.rollback.integrity);
      const rb = assertScriptUrl(m.rollback.scriptUrl, { fixtureMode });
      rollback = {
        scriptUrl: rb.href,
        integrity: m.rollback.integrity.trim(),
      };
    }

    // Server-registry only. Never forwarded to the client loader.
    let configuration: Record<string, unknown> = {};
    if (
      candidate.configuration &&
      typeof candidate.configuration === 'object' &&
      !Array.isArray(candidate.configuration)
    ) {
      configuration = candidate.configuration as Record<string, unknown>;
    }

    // Restricted pages require a separately certified capability. Storefront
    // MVP forces false unless APPS_ALLOW_RESTRICTED_SCRIPT_PAGES=1 (non-prod tests).
    const allowRestrictedEnv =
      process.env.APPS_ALLOW_RESTRICTED_SCRIPT_PAGES === '1' &&
      process.env.NODE_ENV !== 'production';
    const restrictedPagesAllowed =
      allowRestrictedEnv && m.restrictedPagesAllowed === true;

    const script: VerifiedScript = {
      name: m.name,
      version: m.version,
      scriptUrl: href,
      integrity: m.integrity.trim(),
      // Prefer anonymous; use-credentials is a larger cookie surface.
      crossOrigin: 'anonymous',
      executableOrigins,
      consentCategory: m.consentCategory,
      merchantConsentState: 'granted',
      pageScope,
      restrictedPagesAllowed,
      budgets: { maxLoadMs },
      healthStatus,
      rollback,
      mountId: candidate.mountId,
      installationId: candidate.installationId,
      appVersionId: candidate.appVersionId,
      surfaceId: candidate.surfaceId,
      extensionId: candidate.extensionId,
      configRevision: candidate.configRevision,
      configuration,
    };

    return { ok: true, script };
  } catch (err) {
    if (err instanceof ScriptVerifyError) {
      return {
        ok: false,
        code: err.code,
        message: err.message,
        details: err.details,
      };
    }
    return {
      ok: false,
      code: SCRIPT_ERROR_CODES.MANIFEST_INVALID,
      message: err instanceof Error ? err.message : 'Unknown script verify error',
    };
  }
}
