/**
 * Client-safe barrel: types, errors, telemetry, and pure helpers only.
 * Anything touching node:fs / node:crypto (verification, trust registry,
 * fixture sources, registry generation) lives in './server' so a client
 * import of this barrel can never break the browser bundle.
 */

export { PACKAGE_ERROR_CODES, PackageVerifyError } from './errors';
export type { PackageErrorCode } from './errors';
export type {
  ActiveStorefrontMount,
  PackageExport,
  PackageSignature,
  PlatformVersions,
  ResolvedPackageCandidate,
  StorefrontPackageManifest,
  TrustKey,
  TrustRegistry,
  VerifiedMountRegistry,
  VerifiedPackage,
  VerifyResult,
} from './types';
export { buildRegistry, createEmptyRegistry } from './registry/schema';
export type { ActiveMountSource } from './resolve/types';
export { isMountableAtRuntime } from './mount/is-mountable';
export type { RuntimeMountState } from './mount/is-mountable';
export { emitExtensionTelemetry } from './telemetry/extension-telemetry';
export type {
  ExtensionTelemetryEvent,
  ExtensionTelemetryPayload,
} from './telemetry/extension-telemetry';

// Privileged remote scripts (#21)
export { SCRIPT_ERROR_CODES, ScriptVerifyError } from './scripts/errors';
export type { ScriptErrorCode } from './scripts/errors';
export type {
  ActivePrivilegedScriptMount,
  PrivilegedScriptManifest,
  ResolvedScriptCandidate,
  ScriptVerifyResult,
  VerifiedScript,
} from './scripts/types';
export {
  isPathInScriptScope,
  isRestrictedPath,
  matchPathPattern,
  resolveRestrictedPathPrefixes,
  DEFAULT_RESTRICTED_PATH_PREFIXES,
} from './scripts/verify/page-scope';
export { isScriptMountableAtRuntime } from './scripts/mount/is-script-mountable';
export type { RuntimeScriptMountState } from './scripts/mount/is-script-mountable';
export {
  certifiedPolicyFromManifest,
  narrowWithMerchantConfig,
  patternCovers,
} from './scripts/policy/certified-policy';
export type {
  CertifiedManifestExtension,
  CertifiedScriptPolicy,
} from './scripts/policy/certified-policy';
export { buildStorefrontCsp, buildScriptSrcDirective } from './csp/build-csp';
export type { StorefrontCspOptions } from './csp/build-csp';
