import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScriptLoaderProps } from '../types';
import { PrivilegedScriptLoader } from './PrivilegedScriptLoader';

const mocks = vi.hoisted(() => ({
  pathname: '/products/hat',
  inject: vi.fn(),
  teardown: vi.fn(),
  mark: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}));

vi.mock('./inject-script', () => ({
  injectVerifiedScript: mocks.inject,
}));

vi.mock('./realm-guard', () => ({
  enforceRestrictedNavigationTeardown: mocks.teardown,
  markAppScriptExecuted: mocks.mark,
}));

const script: ScriptLoaderProps = {
  name: '@app-script/surface-1',
  version: 'ver-1',
  scriptUrl: 'https://scripts.example.com/v1/app.js',
  integrity: 'sha384-abc',
  crossOrigin: 'anonymous',
  consentCategory: 'marketing',
  pageScope: { allow: ['/**'] },
  restrictedPagesAllowed: false,
  budgets: { maxLoadMs: 1000 },
  mountId: 'm1',
};

beforeEach(() => {
  mocks.pathname = '/products/hat';
  mocks.teardown.mockReturnValue(false);
  mocks.inject.mockResolvedValue({ ok: true, durationMs: 1 });
});

describe('PrivilegedScriptLoader', () => {
  it('marks the realm executed and injects in-scope scripts', async () => {
    render(<PrivilegedScriptLoader scripts={[script]} grantAllConsent />);
    await waitFor(() => expect(mocks.inject).toHaveBeenCalledTimes(1));
    expect(mocks.mark).toHaveBeenCalled();
    expect(mocks.teardown).toHaveBeenCalledWith(
      '/products/hat',
      expect.objectContaining({ restrictedPrefixes: undefined }),
    );
  });

  it('skips all injection when a restricted-path teardown fires', async () => {
    mocks.pathname = '/checkout';
    mocks.teardown.mockReturnValue(true);
    render(<PrivilegedScriptLoader scripts={[script]} grantAllConsent />);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.teardown).toHaveBeenCalledWith(
      '/checkout',
      expect.anything(),
    );
    expect(mocks.inject).not.toHaveBeenCalled();
  });

  it('forwards server-resolved restricted prefixes to the guard', async () => {
    mocks.pathname = '/en/checkout';
    mocks.teardown.mockReturnValue(true);
    render(
      <PrivilegedScriptLoader
        scripts={[script]}
        grantAllConsent
        restrictedPathPrefixes={['/checkout', '/en/checkout']}
      />,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.teardown).toHaveBeenCalledWith('/en/checkout', {
      restrictedPrefixes: ['/checkout', '/en/checkout'],
    });
    expect(mocks.inject).not.toHaveBeenCalled();
  });
});
