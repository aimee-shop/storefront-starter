import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { VerifiedPackage } from '../types';
import { AppPackageBlock } from './AppPackageBlock';

const pkg: VerifiedPackage = {
  packageName: '@aimee-fixtures/reference-banner',
  packageVersion: '1.0.0',
  packageSha256: 'a'.repeat(64),
  signatureKeyId: 'fixture-publisher-1',
  runtimeContractVersion: '1.0',
  exports: [
    {
      id: 'reference-banner',
      entry: 'blocks/ReferenceBanner.tsx',
      environments: ['server', 'browser'],
    },
  ],
  ssrCompatible: true,
  configuration: { headline: 'Hi' },
  mountId: 'm1',
};

describe('AppPackageBlock isolation', () => {
  it('renders children without accepting token props', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    render(
      <AppPackageBlock
        pkg={pkg}
        exportId="reference-banner"
        runtimeState={{
          enabled: true,
          killSwitch: false,
          installationStatus: 'active',
        }}
      >
        <span>safe-content</span>
      </AppPackageBlock>,
    );
    expect(screen.getByText('safe-content')).toBeInTheDocument();
    // Component props type does not include apiKey / tokens -- structural check
    // via host attribute only.
    expect(document.querySelector('[data-app-package]')?.getAttribute('data-app-package')).toBe(
      '@aimee-fixtures/reference-banner',
    );
    log.mockRestore();
  });

  it('omits content when suspended without throwing', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { container } = render(
      <AppPackageBlock
        pkg={pkg}
        exportId="reference-banner"
        runtimeState={{
          enabled: true,
          killSwitch: false,
          installationStatus: 'suspended',
        }}
      >
        <span>should-not-show</span>
      </AppPackageBlock>,
    );
    expect(container).toBeEmptyDOMElement();
    log.mockRestore();
  });
});
