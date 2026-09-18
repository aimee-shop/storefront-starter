import type { VerifiedPackage } from '../types';

/**
 * Runtime mountability gate (post-build).
 * Suspend / uninstall / kill-switch are re-checked without a full rebuild.
 */
export interface RuntimeMountState {
  enabled: boolean;
  killSwitch: boolean;
  installationStatus: string;
  mountStatus?: string;
}

export function isMountableAtRuntime(
  pkg: VerifiedPackage,
  state: RuntimeMountState | null | undefined,
): boolean {
  // Fail closed when the host did not supply runtime state.
  // Callers must pass an explicit snapshot (build registry baseline and/or live SDK).
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
  void pkg;
  return true;
}
