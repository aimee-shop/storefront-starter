import { describe, expect, it } from 'vitest';
import type { VerifiedScript } from '../types';
import { isScriptMountableAtRuntime } from './is-script-mountable';

const script: VerifiedScript = {
  name: '@aimee-fixtures/reference-script',
  version: '1.0.0',
  scriptUrl: '/apps-fixtures/reference-script.js',
  integrity: 'sha384-abc',
  crossOrigin: 'anonymous',
  executableOrigins: ['self'],
  consentCategory: 'marketing',
  merchantConsentState: 'granted',
  pageScope: { allow: ['/**'] },
  restrictedPagesAllowed: false,
  budgets: { maxLoadMs: 2000 },
  healthStatus: 'healthy',
  mountId: 'm1',
  configuration: {},
};

describe('isScriptMountableAtRuntime', () => {
  it('fails closed when runtime state is missing', () => {
    expect(isScriptMountableAtRuntime(script, null)).toBe(false);
    expect(isScriptMountableAtRuntime(script, undefined)).toBe(false);
  });

  it('blocks kill switch and disabled mounts', () => {
    expect(
      isScriptMountableAtRuntime(script, {
        enabled: true,
        killSwitch: true,
        installationStatus: 'active',
      }),
    ).toBe(false);
    expect(
      isScriptMountableAtRuntime(script, {
        enabled: false,
        killSwitch: false,
        installationStatus: 'active',
      }),
    ).toBe(false);
    expect(
      isScriptMountableAtRuntime(script, {
        enabled: true,
        killSwitch: false,
        installationStatus: 'active',
        mountStatus: 'killed',
      }),
    ).toBe(false);
  });

  it('allows active enabled mount', () => {
    expect(
      isScriptMountableAtRuntime(script, {
        enabled: true,
        killSwitch: false,
        installationStatus: 'active',
        mountStatus: 'enabled',
      }),
    ).toBe(true);
  });
});
