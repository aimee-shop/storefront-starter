import type { VerifiedScript } from '../types';

/**
 * Runtime mountability gate for privileged scripts (post-build).
 * Kill switch / suspend re-checked without a full rebuild.
 */
export interface RuntimeScriptMountState {
  enabled: boolean;
  killSwitch: boolean;
  installationStatus: string;
  mountStatus?: string;
}

export function isScriptMountableAtRuntime(
  script: VerifiedScript,
  state: RuntimeScriptMountState | null | undefined,
): boolean {
  if (!state) return false;
  if (state.killSwitch) return false;
  if (!state.enabled) return false;
  if (
    state.installationStatus !== 'active' &&
    state.installationStatus !== 'configuring'
  ) {
    return false;
  }
  if (
    state.mountStatus === 'suspended' ||
    state.mountStatus === 'disabled' ||
    state.mountStatus === 'killed'
  ) {
    return false;
  }
  void script;
  return true;
}
