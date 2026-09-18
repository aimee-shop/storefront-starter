import { describe, expect, it } from 'vitest';
import type { VerifiedPackage } from '../types';
import { isMountableAtRuntime } from './is-mountable';

const pkg: VerifiedPackage = {
  packageName: '@aimee-fixtures/reference-banner',
  packageVersion: '1.0.0',
  packageSha256: 'a'.repeat(64),
  signatureKeyId: 'fixture-publisher-1',
  runtimeContractVersion: '1.0',
  exports: [{ id: 'reference-banner', entry: 'blocks/ReferenceBanner.tsx', environments: ['server', 'browser'] }],
  ssrCompatible: true,
  configuration: { headline: 'Hi' },
  mountId: 'm1',
};

describe('isMountableAtRuntime', () => {
  it('fails closed when runtime state is missing', () => {
    expect(isMountableAtRuntime(pkg, null)).toBe(false);
    expect(isMountableAtRuntime(pkg, undefined)).toBe(false);
  });

  it('blocks kill switch, disabled, suspended install', () => {
    expect(
      isMountableAtRuntime(pkg, {
        enabled: true,
        killSwitch: true,
        installationStatus: 'active',
      }),
    ).toBe(false);
    expect(
      isMountableAtRuntime(pkg, {
        enabled: false,
        killSwitch: false,
        installationStatus: 'active',
      }),
    ).toBe(false);
    expect(
      isMountableAtRuntime(pkg, {
        enabled: true,
        killSwitch: false,
        installationStatus: 'suspended',
      }),
    ).toBe(false);
  });

  it('allows active enabled mount', () => {
    expect(
      isMountableAtRuntime(pkg, {
        enabled: true,
        killSwitch: false,
        installationStatus: 'active',
        mountStatus: 'enabled',
      }),
    ).toBe(true);
  });
});
