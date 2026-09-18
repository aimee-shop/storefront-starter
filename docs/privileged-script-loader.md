# Privileged remote storefront script loader

Issue #21. Builds on signed build-time packages (#20); does not fork package
trust or signature machinery. Scripts use **SRI integrity** on immutable HTTPS
URLs, not Ed25519 package digests.

## Overview

1. Resolve active `privileged_remote_script` mounts (fixture or SDK)
2. Verify fail-closed (URL, SRI, origins, merchant consent, health, scope, budget)
3. Write verified scripts into `.generated/app-mounts.json` (`scripts[]`)
4. Write CSP allowlist `.generated/app-script-csp-origins.json`
5. Runtime: kill-switch check -> client loader -> page scope + customer consent
   -> inject `<script async integrity crossorigin src>` only

## Commands

```bash
npm run apps:verify                              # empty packages+scripts (default)
npm run apps:verify:fixture                      # package + script fixtures
npm run apps:verify -- --script-fixture reference-signed
npm test -- lib/apps
```

## Fail-closed error codes

| Code | Gate |
|------|------|
| `SCRIPT_URL_INVALID` | Not HTTPS (or bad fixture path) |
| `SCRIPT_INTEGRITY_INVALID` | Malformed SRI |
| `SCRIPT_INTEGRITY_MISMATCH` | Local fixture body != declared SRI |
| `SCRIPT_ORIGIN_MISMATCH` | URL origin not in executableOrigins |
| `SCRIPT_CONSENT_REQUIRED` | Merchant consent not granted |
| `SCRIPT_HEALTH_BLOCKED` | unhealthy / degraded |
| `SCRIPT_SCOPE_INVALID` | Missing page scope / executable origins |
| `SCRIPT_BUDGET_INVALID` | maxLoadMs missing or out of range |
| `SCRIPT_CERTIFICATION` | Fixture-only path used without fixture gate |

## Runtime kill switches (no rebuild)

```bash
APPS_DISABLE_SCRIPT_MOUNTS=1
APPS_DISABLED_SCRIPT_MOUNT_IDS=id1,id2
```

Platform/merchant kill on AppExtensionMount is enforced by active projection
(mount drops out of verify). Env kill switches stop execution immediately on
the next request without redeploying artifacts.

## Consent

- **Merchant consent**: required at verify (`merchantConsentState === granted`)
- **Customer consent**: cookie `aimee_consent_categories` (JSON array of categories)
- Test only (non-production): `APPS_SCRIPT_CONSENT_GRANT_ALL=1`
  (never use a NEXT_PUBLIC_ grant-all flag)

## Restricted pages (default)

Scripts never run on checkout, payment methods, reset-password, login/register
paths unless `restrictedPagesAllowed` is true (separately certified capability;
fixtures keep this false).

## Security rules

- No script injection without successful verify
- No eval / Function / innerHTML / srcdoc of unverified strings
- Loader never passes API keys, bearer, refresh, admin, or payment credentials
- CSP `script-src` is `'self'` + pinned executable origins only (no
  `unsafe-eval`, no `strict-dynamic`)
- Telemetry is app/version/surface/mount only (no customer PII)
- Core storefront rendering is isolated from script timeout/error

## Related

- `docs/signed-app-packages.md` -- package tier (#20)
- requirements/workflows-app-platform-4-extension-surfaces.md section 4
