import 'server-only';

import type { VerifiedScript } from '../types';
import type { RuntimeScriptMountState } from './is-script-mountable';

/**
 * Resolve runtime mountability for a verified privileged script.
 *
 * Build-time registry is the pin of what *may* load. Runtime can still disable:
 * - APPS_DISABLE_SCRIPT_MOUNTS=1  -- kill all script mounts without rebuild
 * - APPS_DISABLED_SCRIPT_MOUNT_IDS=id1,id2 -- kill specific mount ids
 */
export function resolveRuntimeScriptMountState(
  script: VerifiedScript,
): RuntimeScriptMountState {
  if (process.env.APPS_DISABLE_SCRIPT_MOUNTS === '1') {
    return {
      enabled: false,
      killSwitch: true,
      installationStatus: 'suspended',
      mountStatus: 'killed',
    };
  }

  const disabledIds = (process.env.APPS_DISABLED_SCRIPT_MOUNT_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (script.mountId && disabledIds.includes(script.mountId)) {
    return {
      enabled: false,
      killSwitch: true,
      installationStatus: 'active',
      mountStatus: 'killed',
    };
  }

  return {
    enabled: true,
    killSwitch: false,
    installationStatus: 'active',
    mountStatus: 'enabled',
  };
}
