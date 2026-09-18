/**
 * Server-only barrel: everything from './index' plus the node:fs /
 * node:crypto surface (verification pipelines, trust registry, fixture
 * sources, registry generation, platform policy env loading). Build scripts
 * and server components import from here; client code imports './index'.
 *
 * No `import 'server-only'` guard on purpose: scripts/apps-verify-packages.ts
 * runs this through plain tsx outside the Next.js runtime, where the guard
 * package would throw. The node:* imports themselves already fail any client
 * bundle that reaches this file.
 */

export * from './index';

export { loadTrustRegistry, parseTrustRegistry, findTrustKey } from './trust/registry';
export { verifyPackage, verifyPackages } from './verify/pipeline';
export { computePackageSha256 } from './verify/checksum';
export { writeRegistry, writeScriptCspOrigins, DEFAULT_REGISTRY_RELATIVE_PATH } from './registry/generate';
export {
  EmptyActiveMountSource,
  FixtureActiveMountSource,
} from './resolve/fixture-source';
export type { FixtureMountSpec } from './resolve/fixture-source';
export { verifyScript } from './scripts/verify/pipeline';
export type { ScriptVerifyOptions } from './scripts/verify/pipeline';
export {
  FixturePrivilegedScriptSource,
  EmptyPrivilegedScriptSource,
} from './scripts/resolve/fixture-script-source';
export type { FixtureScriptSpec } from './scripts/resolve/fixture-script-source';
export {
  loadScriptCspOrigins,
  DEFAULT_CSP_ORIGINS_RELATIVE_PATH,
} from './csp/script-origins';
export type { ScriptCspOriginsFile } from './csp/script-origins';
export {
  loadPlatformScriptPolicy,
  parseAllowedScriptOrigins,
} from './scripts/policy/platform-policy';
export type { PlatformScriptPolicy } from './scripts/policy/platform-policy';
