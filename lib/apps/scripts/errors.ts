/**
 * Stable fail-closed error codes for privileged remote script verification.
 * CI and tests assert these exact strings -- do not rename lightly.
 */
export const SCRIPT_ERROR_CODES = {
  URL_INVALID: 'SCRIPT_URL_INVALID',
  INTEGRITY_INVALID: 'SCRIPT_INTEGRITY_INVALID',
  ORIGIN_MISMATCH: 'SCRIPT_ORIGIN_MISMATCH',
  CONSENT_REQUIRED: 'SCRIPT_CONSENT_REQUIRED',
  HEALTH_BLOCKED: 'SCRIPT_HEALTH_BLOCKED',
  SCOPE_INVALID: 'SCRIPT_SCOPE_INVALID',
  BUDGET_INVALID: 'SCRIPT_BUDGET_INVALID',
  CERTIFICATION: 'SCRIPT_CERTIFICATION',
  CONFIG_INVALID: 'SCRIPT_CONFIG_INVALID',
  MANIFEST_INVALID: 'SCRIPT_MANIFEST_INVALID',
  INTEGRITY_MISMATCH: 'SCRIPT_INTEGRITY_MISMATCH',
} as const;

export type ScriptErrorCode =
  (typeof SCRIPT_ERROR_CODES)[keyof typeof SCRIPT_ERROR_CODES];

export class ScriptVerifyError extends Error {
  readonly code: ScriptErrorCode;
  readonly details?: unknown;

  constructor(code: ScriptErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ScriptVerifyError';
    this.code = code;
    this.details = details;
  }
}
