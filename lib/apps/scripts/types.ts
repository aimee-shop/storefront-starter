import type { ScriptErrorCode } from './errors';

/** Cross-origin policy for remote script elements. Prefer anonymous. */
export type ScriptCrossOrigin = 'anonymous' | 'use-credentials';

export type ScriptMerchantConsentState = 'granted' | 'pending' | 'revoked' | 'not_required';

export type ScriptHealthStatus = 'healthy' | 'unknown' | 'degraded' | 'unhealthy';

/**
 * Fixture / candidate descriptor for a privileged-storefront-script mount.
 * Build-time verify produces VerifiedScript for the registry.
 */
export interface PrivilegedScriptManifest {
  name: string;
  version: string;
  /** Absolute HTTPS URL of the immutable script artifact. */
  scriptUrl: string;
  /** SRI integrity (sha256|sha384|sha512-base64). */
  integrity: string;
  crossOrigin?: ScriptCrossOrigin;
  /** HTTPS origins this script and its children may load from (CSP allowlist). */
  executableOrigins: string[];
  consentCategory: string;
  pageScope: {
    allow?: string[];
    deny?: string[];
  };
  /** Separate certified capability; default false. */
  restrictedPagesAllowed?: boolean;
  budgets: {
    maxLoadMs: number;
  };
  healthStatus?: ScriptHealthStatus;
  rollback?: {
    scriptUrl: string;
    integrity: string;
  };
  /** Optional local file used only to recompute integrity in fixture mode. */
  localScriptPath?: string;
}

export interface ResolvedScriptCandidate {
  manifest: PrivilegedScriptManifest;
  mountId?: string;
  installationId?: string;
  appVersionId?: string;
  surfaceId?: string;
  extensionId?: string;
  configRevision?: number;
  configuration?: unknown;
  merchantConsentState: ScriptMerchantConsentState;
  /** Absolute package/fixture root for local integrity recompute. */
  fixtureRoot?: string;
  /** When true, allow fixture-local non-production URL schemes only if fixture gate set. */
  fixtureMode?: boolean;
}

export interface VerifiedScript {
  name: string;
  version: string;
  scriptUrl: string;
  integrity: string;
  crossOrigin: ScriptCrossOrigin;
  executableOrigins: string[];
  consentCategory: string;
  merchantConsentState: 'granted';
  pageScope: {
    allow?: string[];
    deny?: string[];
  };
  restrictedPagesAllowed: boolean;
  budgets: {
    maxLoadMs: number;
  };
  healthStatus: 'healthy' | 'unknown';
  rollback?: {
    scriptUrl: string;
    integrity: string;
  };
  mountId?: string;
  installationId?: string;
  appVersionId?: string;
  surfaceId?: string;
  extensionId?: string;
  configRevision?: number;
  /**
   * Secret-free config retained in the server registry only.
   * Never pass this object into client components (see ScriptLoaderProps).
   */
  configuration: Record<string, unknown>;
}

/**
 * Client-safe subset of VerifiedScript. No configuration blob, no rollback
 * metadata that is unused by the injector (reduces leakage surface).
 */
export interface ScriptLoaderProps {
  name: string;
  version: string;
  scriptUrl: string;
  integrity: string;
  crossOrigin: ScriptCrossOrigin;
  consentCategory: string;
  pageScope: {
    allow?: string[];
    deny?: string[];
  };
  restrictedPagesAllowed: boolean;
  budgets: {
    maxLoadMs: number;
  };
  mountId: string;
  installationId?: string;
  appVersionId?: string;
  surfaceId?: string;
  extensionId?: string;
}

export function toScriptLoaderProps(script: VerifiedScript): ScriptLoaderProps | null {
  if (!script.mountId) return null;
  return {
    name: script.name,
    version: script.version,
    scriptUrl: script.scriptUrl,
    integrity: script.integrity,
    crossOrigin: script.crossOrigin,
    consentCategory: script.consentCategory,
    pageScope: script.pageScope,
    restrictedPagesAllowed: script.restrictedPagesAllowed,
    budgets: script.budgets,
    mountId: script.mountId,
    installationId: script.installationId,
    appVersionId: script.appVersionId,
    surfaceId: script.surfaceId,
    extensionId: script.extensionId,
  };
}


export type ScriptVerifyResult =
  | { ok: true; script: VerifiedScript }
  | { ok: false; code: ScriptErrorCode; message: string; details?: unknown };

/** Active privileged script mount projection used by resolve layer. */
export interface ActivePrivilegedScriptMount {
  id: string;
  installationId: string;
  appVersionId: string;
  surfaceId: string;
  extensionId: string;
  mountType: 'privileged_remote_script';
  configRevision: number;
  configuration: unknown;
  merchantConsentState: ScriptMerchantConsentState;
  healthStatus: ScriptHealthStatus;
  manifest: PrivilegedScriptManifest;
  fixtureRoot?: string;
}
