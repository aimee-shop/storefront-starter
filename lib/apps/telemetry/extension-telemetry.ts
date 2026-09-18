/**
 * Structured extension telemetry without customer PII.
 * Fields are limited to app/package/version/surface/mount identifiers.
 */

export type ExtensionTelemetryEvent =
  | 'mount_render'
  | 'mount_skipped'
  | 'verify_pass'
  | 'verify_fail'
  | 'upgrade_digest'
  | 'rollback_digest'
  | 'script_load'
  | 'script_error'
  | 'script_timeout'
  | 'script_skipped'
  | 'script_budget_exceeded'
  | 'script_verify_pass'
  | 'script_verify_fail';

export interface ExtensionTelemetryPayload {
  event: ExtensionTelemetryEvent;
  packageName?: string;
  packageVersion?: string;
  packageSha256?: string;
  appVersionId?: string;
  surfaceId?: string;
  mountId?: string;
  installationId?: string;
  exportId?: string;
  reason?: string;
  priorSha256?: string;
  deployCorrelationId?: string;
}

const SCRIPT_EVENTS = new Set<ExtensionTelemetryEvent>([
  'script_load',
  'script_error',
  'script_timeout',
  'script_skipped',
  'script_budget_exceeded',
  'script_verify_pass',
  'script_verify_fail',
]);

export function emitExtensionTelemetry(payload: ExtensionTelemetryPayload): void {
  // Structured log line for CloudWatch / Vercel log drains.
  // Never include customer email, order ids, cart contents, or tokens.
  const source = SCRIPT_EVENTS.has(payload.event)
    ? 'storefront-app-script'
    : 'storefront-app-package';
  const line = JSON.stringify({
    source,
    ts: new Date().toISOString(),
    ...payload,
  });
  if (
    payload.event === 'verify_fail' ||
    payload.event === 'script_verify_fail' ||
    payload.event === 'script_error'
  ) {
    console.error(line);
  } else {
    console.info(line);
  }
}
