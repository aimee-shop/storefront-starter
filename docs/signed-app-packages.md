# Signed build-time App storefront packages

Issue #20. Privileged remote scripts are #21 and are **not** implemented here.

## Overview

Storefront extensions of the `storefront-package` tier are:

1. Resolved at **build / verify** time from fixtures or the apps API
2. Verified fail-closed (checksum, Ed25519 signature, compatibility, static gates, config)
3. Written to `.generated/app-mounts.json`
4. Rendered only through the host (`AppPackageBlock`) with validated config

## Commands

```bash
npm run apps:verify                 # empty mounts (default) or APPS_MOUNT_SOURCE
npm run apps:verify:fixture         # verify + register reference-signed fixture
npm run apps:verify -- --dry-run    # verify without writing registry
npm test                            # includes package gate unit tests
```

## Fail-closed error codes

| Code | Gate |
|------|------|
| `PACKAGE_SIGNATURE_INVALID` | Bad or missing Ed25519 signature |
| `PACKAGE_CHECKSUM_MISMATCH` | Digest mismatch (signature claim or AppVersion artifact) |
| `PACKAGE_COMPAT_RANGE` | storefrontStarter / blocks range |
| `PACKAGE_UNDECLARED_REMOTE` | Remote / dynamic executable code |
| `PACKAGE_FORBIDDEN_API` | fs, eval, process.env, etc. |
| `PACKAGE_BUDGET` | Bundle size over manifest budget |
| `PACKAGE_SERVER_CLIENT_BOUNDARY` | Browser export imports Node built-ins |
| `PACKAGE_CONFIG_INVALID` | Mount configuration fails export JSON Schema |

## Trust keys

- Production / SDK verifies: **require** `APPS_TRUST_REGISTRY_PATH=/path/to/registry.json`
- Fixture gates only: `APPS_ALLOW_FIXTURE_TRUST=1` (or `--fixture`) uses
  `fixtures/apps/trust/registry.json`
- Local signer material: `fixtures/apps/trust/signer.local.json` (gitignored)

## Runtime disable without rebuild

```bash
APPS_DISABLE_PACKAGE_MOUNTS=1     # kill all package mounts
APPS_DISABLED_MOUNT_IDS=id1,id2   # kill specific mounts
```

Full per-install suspend via live active-mount projection needs `apps:read` and
is a follow-up; next deploy always drops suspended mounts from the registry.

## Host allowlist (no package code execution)

Verified package digests are recorded at build time. Runtime renders only
host-allowlisted components bound to `packageName` + `exportId` with validated
config. Package entry files are not dynamically imported (stronger than
regex-only static analysis alone).

## Live SDK resolution

```bash
APPS_MOUNT_SOURCE=sdk \
  NEXT_PUBLIC_STORE_ID=... \
  NEXT_PUBLIC_CORE_API_URL=... \
  AIMEE_API_KEY=... \          # needs apps:read
  APPS_PACKAGE_ROOT=/path/to/package \
  npm run apps:verify
```

Uses `@aimee.shop/sdk-platform` (optional). Storefront (Default) RBAC currently
lacks `apps:read`; use a dedicated build credential or fixture mode until that
grant lands.

## Security rules

- No package code path without successful verify
- Host never passes API keys, admin tokens, or other installation configs
- Suspend / kill-switch re-checked at runtime via `isMountableAtRuntime`
- Telemetry is app/version/surface/mount only (no customer PII)
- Remote script loader: see `docs/privileged-script-loader.md` (#21)
