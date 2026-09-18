import type { PackageErrorCode } from './errors';
import type { VerifiedScript } from './scripts/types';

/** Environments a package export may declare. */
export type PackageEnvironment = 'server' | 'browser';

/** Storefront package contract (package root aimee.storefront-package.json). */
export interface StorefrontPackageManifest {
  name: string;
  version: string;
  runtimeContractVersion: string;
  compatible: {
    storefrontStarter: string;
    blocks: string;
  };
  exports: PackageExport[];
  requestedOrigins?: string[];
  customerDataClassifications?: string[];
  budgets: {
    maxBundleBytes: number;
    maxParseMs?: number;
  };
  ssrCompatible: boolean;
  upgradeNotes?: string;
  rollbackNotes?: string;
}

export interface PackageExport {
  id: string;
  entry: string;
  environments: PackageEnvironment[];
  configSchema?: Record<string, unknown>;
}

/** Ed25519 package signature file (signature.json). */
export interface PackageSignature {
  keyId: string;
  algorithm: 'ed25519';
  value: string;
  packageSha256: string;
  signedAt: string;
}

export interface TrustKey {
  keyId: string;
  algorithm: 'ed25519';
  publicKeyPem: string;
}

export interface TrustRegistry {
  keys: TrustKey[];
}

/** Platform versions the storefront claims at verify time. */
export interface PlatformVersions {
  storefrontStarter: string;
  blocks: string;
}

/** Resolved candidate before verification. */
export interface ResolvedPackageCandidate {
  /** Filesystem root of the package artifact. */
  packageRoot: string;
  /** Mount / install correlation (optional for pure fixture verify). */
  mountId?: string;
  installationId?: string;
  appVersionId?: string;
  surfaceId?: string;
  extensionId?: string;
  /** Tenant/store scoped configuration for the mount. */
  configuration?: unknown;
  /** Optional expected digest from AppVersion.artifactChecksums. */
  expectedPackageSha256?: string;
  /** When false, skip config schema check (e.g. dry-run without config). */
  requireConfig?: boolean;
}

export interface VerifiedPackageExport {
  id: string;
  entry: string;
  environments: PackageEnvironment[];
}

export interface VerifiedPackage {
  packageName: string;
  packageVersion: string;
  packageSha256: string;
  signatureKeyId: string;
  runtimeContractVersion: string;
  exports: VerifiedPackageExport[];
  ssrCompatible: boolean;
  mountId?: string;
  installationId?: string;
  appVersionId?: string;
  surfaceId?: string;
  extensionId?: string;
  configRevision?: number;
  /** Validated configuration object (or empty object). */
  configuration: Record<string, unknown>;
}

export interface VerifiedMountRegistry {
  schemaVersion: '1';
  generatedAt: string;
  deployCorrelationId: string;
  platform: PlatformVersions;
  packages: VerifiedPackage[];
  /**
   * Privileged remote scripts (#21). Optional for backward compatibility with
   * registries written before script support; treat missing as [].
   */
  scripts?: VerifiedScript[];
}

export type VerifyResult =
  | { ok: true; package: VerifiedPackage }
  | { ok: false; code: PackageErrorCode; message: string; details?: unknown };

/** Active mount projection entry used by resolve layer. */
export interface ActiveStorefrontMount {
  id: string;
  installationId: string;
  appVersionId: string;
  surfaceId: string;
  extensionId: string;
  mountType: string;
  configRevision: number;
  configuration: unknown;
  /** Absolute or relative path / URL to package artifact root. */
  packageLocation: string;
  expectedPackageSha256?: string;
  packageManifest?: StorefrontPackageManifest;
}
