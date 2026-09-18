import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  enforceRestrictedNavigationTeardown,
  hasAppScriptExecuted,
  markAppScriptExecuted,
  resetRealmGuardForTests,
} from './realm-guard';

function stubLocation() {
  return { reload: vi.fn() };
}

afterEach(() => {
  resetRealmGuardForTests();
});

describe('realm-guard', () => {
  it('does nothing when no app script has executed (initial checkout load)', () => {
    const location = stubLocation();
    expect(
      enforceRestrictedNavigationTeardown('/checkout', { location }),
    ).toBe(false);
    expect(location.reload).not.toHaveBeenCalled();
  });

  it('forces a document navigation into restricted paths after execution', () => {
    const location = stubLocation();
    markAppScriptExecuted();
    expect(hasAppScriptExecuted()).toBe(true);
    expect(
      enforceRestrictedNavigationTeardown('/checkout', { location }),
    ).toBe(true);
    expect(
      enforceRestrictedNavigationTeardown('/account/payment-methods', { location }),
    ).toBe(true);
    expect(location.reload).toHaveBeenCalledTimes(2);
  });

  it('does not tear down on non-restricted paths', () => {
    const location = stubLocation();
    markAppScriptExecuted();
    expect(
      enforceRestrictedNavigationTeardown('/products/hat', { location }),
    ).toBe(false);
    expect(location.reload).not.toHaveBeenCalled();
  });

  it('honors extra restricted prefixes', () => {
    const location = stubLocation();
    markAppScriptExecuted();
    expect(
      enforceRestrictedNavigationTeardown('/en/checkout', { location }),
    ).toBe(false);
    expect(
      enforceRestrictedNavigationTeardown('/en/checkout', {
        location,
        restrictedPrefixes: ['/en/checkout'],
      }),
    ).toBe(true);
  });

  it('cannot loop: a fresh realm starts untainted', () => {
    const location = stubLocation();
    markAppScriptExecuted();
    expect(
      enforceRestrictedNavigationTeardown('/checkout', { location }),
    ).toBe(true);
    // Document navigation resets module state; simulate the fresh realm.
    resetRealmGuardForTests();
    expect(
      enforceRestrictedNavigationTeardown('/checkout', { location }),
    ).toBe(false);
    expect(location.reload).toHaveBeenCalledTimes(1);
  });
});
