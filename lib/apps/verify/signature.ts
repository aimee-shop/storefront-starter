import { createPublicKey, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACKAGE_ERROR_CODES, PackageVerifyError } from '../errors';
import { findTrustKey } from '../trust/registry';
import type { PackageSignature, TrustRegistry } from '../types';
import { computePackageSha256, timingSafeEqualHex } from './checksum';

/**
 * Load signature.json, verify claimed digest matches package bytes and
 * Ed25519 signature verifies under the trusted publisher key.
 */
export function assertPackageSignature(
  packageRoot: string,
  trust: TrustRegistry,
  expectedPackageSha256?: string,
): { packageSha256: string; keyId: string } {
  let signature: PackageSignature;
  try {
    signature = JSON.parse(
      readFileSync(join(packageRoot, 'signature.json'), 'utf8'),
    ) as PackageSignature;
  } catch {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.SIGNATURE_INVALID,
      'signature.json is missing or unreadable',
    );
  }

  if (signature.algorithm !== 'ed25519' || !signature.value || !signature.keyId) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.SIGNATURE_INVALID,
      'signature.json is incomplete or uses an unsupported algorithm',
    );
  }

  const computed = computePackageSha256(packageRoot);

  if (!timingSafeEqualHex(computed, signature.packageSha256)) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.CHECKSUM_MISMATCH,
      'packageSha256 in signature does not match package contents',
      { computed, claimed: signature.packageSha256 },
    );
  }

  if (
    expectedPackageSha256 &&
    !timingSafeEqualHex(computed, expectedPackageSha256)
  ) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.CHECKSUM_MISMATCH,
      'package digest does not match AppVersion artifactChecksums',
      { computed, expected: expectedPackageSha256 },
    );
  }

  const trustKey = findTrustKey(trust, signature.keyId);
  if (!trustKey) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.PUBLISHER_UNAUTHORIZED,
      `No publisher trust key for keyId "${signature.keyId}"`,
    );
  }

  const digestBuf = Buffer.from(computed, 'hex');
  let sigBuf: Buffer;
  try {
    sigBuf = Buffer.from(signature.value, 'base64');
  } catch {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.SIGNATURE_INVALID,
      'signature value is not valid base64',
    );
  }

  let publicKey;
  try {
    publicKey = createPublicKey(trustKey.publicKeyPem);
  } catch {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.PUBLISHER_UNAUTHORIZED,
      `Trust key "${signature.keyId}" public key is invalid`,
    );
  }

  const ok = verify(null, digestBuf, publicKey, sigBuf);
  if (!ok) {
    throw new PackageVerifyError(
      PACKAGE_ERROR_CODES.SIGNATURE_INVALID,
      'Ed25519 signature verification failed',
      { keyId: signature.keyId },
    );
  }

  return { packageSha256: computed, keyId: signature.keyId };
}
