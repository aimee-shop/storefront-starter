import 'server-only';

import type { VerifiedPackage } from '../types';
import type { RuntimeMountState } from './is-mountable';

/**
 * Resolve runtime mountability for a verified package.
 *
 * Build-time registry is the pin of what *may* mount. Runtime can still disable:
 * - APPS_DISABLE_PACKAGE_MOUNTS=1  -- kill all package mounts without rebuild
 * - APPS_DISABLED_MOUNT_IDS=id1,id2 -- kill specific mount ids
 *
 * Full per-install live projection (suspend without env) requires apps:read +
 * sdk-platform and can be layered later; until then next deploy / env kill switch.
 */
export function resolveRuntimeMountState(
  pkg: VerifiedPackage,
): RuntimeMountState {
  if (process.env.APPS_DISABLE_PACKAGE_MOUNTS === '1') {
    return {
      enabled: false,
      killSwitch: true,
      installationStatus: 'suspended',
      mountStatus: 'killed',
    };
  }

  const disabledIds = (process.env.APPS_DISABLED_MOUNT_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (pkg.mountId && disabledIds.includes(pkg.mountId)) {
    return {
      enabled: false,
      killSwitch: true,
      installationStatus: 'active',
      mountStatus: 'killed',
    };
  }

  // Registry entry implies the package was mountable at last successful verify.
  return {
    enabled: true,
    killSwitch: false,
    installationStatus: 'active',
    mountStatus: 'enabled',
  };
}
