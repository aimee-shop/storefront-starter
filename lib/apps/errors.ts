/**
 * Stable fail-closed error codes for signed storefront package verification.
 * CI and tests assert these exact strings -- do not rename lightly.
 */
export const PACKAGE_ERROR_CODES = {
  MANIFEST_INVALID: 'PACKAGE_MANIFEST_INVALID',
  CHECKSUM_MISMATCH: 'PACKAGE_CHECKSUM_MISMATCH',
  SIGNATURE_INVALID: 'PACKAGE_SIGNATURE_INVALID',
  PUBLISHER_UNAUTHORIZED: 'PACKAGE_PUBLISHER_UNAUTHORIZED',
  COMPAT_RANGE: 'PACKAGE_COMPAT_RANGE',
  UNDECLARED_REMOTE: 'PACKAGE_UNDECLARED_REMOTE',
  FORBIDDEN_API: 'PACKAGE_FORBIDDEN_API',
  BUDGET: 'PACKAGE_BUDGET',
  BOUNDARY: 'PACKAGE_SERVER_CLIENT_BOUNDARY',
  CONFIG_INVALID: 'PACKAGE_CONFIG_INVALID',
  DEPENDENCY_POLICY: 'PACKAGE_DEPENDENCY_POLICY',
  ARTIFACT_MISSING: 'PACKAGE_ARTIFACT_MISSING',
  MOUNT_NOT_MOUNTABLE: 'PACKAGE_MOUNT_NOT_MOUNTABLE',
} as const;

export type PackageErrorCode =
  (typeof PACKAGE_ERROR_CODES)[keyof typeof PACKAGE_ERROR_CODES];

export class PackageVerifyError extends Error {
  readonly code: PackageErrorCode;
  readonly details?: unknown;

  constructor(code: PackageErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'PackageVerifyError';
    this.code = code;
    this.details = details;
  }
}
