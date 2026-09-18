import { describe, expect, it } from 'vitest';
import { buildThemeCssOverrides } from './theme';

describe('buildThemeCssOverrides', () => {
  it('emits locked gradient tokens for valid linear/radial/conic values', () => {
    const css = buildThemeCssOverrides({
      gradients: {
        headline: 'linear-gradient(90deg, #FF5733, #00AA88)',
        accent: 'radial-gradient(circle, #111 0%, #000 100%)',
      },
    });

    expect(css).toContain(
      '--zb-headline-gradient: linear-gradient(90deg, #FF5733, #00AA88)',
    );
    expect(css).toContain('--zb-headline-text-fill: transparent');
    expect(css).toContain(
      '--zb-subheadline-gradient: radial-gradient(circle, #111 0%, #000 100%)',
    );
    expect(css).toContain('--zb-subheadline-text-fill: transparent');
  });

  it('emits a conic headline gradient with the fill pair', () => {
    const css = buildThemeCssOverrides({
      gradients: {
        headline: 'conic-gradient(from 90deg, #000, #fff)',
      },
    });

    expect(css).toContain(
      '--zb-headline-gradient: conic-gradient(from 90deg, #000, #fff)',
    );
    expect(css).toContain('--zb-headline-text-fill: transparent');
    expect(css).not.toContain('--zb-subheadline-gradient');
  });

  it('drops url(), expression(), javascript:, @import, backslash, empty, and oversized gradients', () => {
    const css = buildThemeCssOverrides({
      gradients: {
        headline: 'linear-gradient(url(https://evil.example/x.png))',
        accent: 'linear-gradient(expression(alert(1)))',
      },
    });
    expect(css).toBe('');

    expect(
      buildThemeCssOverrides({
        gradients: { headline: 'linear-gradient(javascript:alert(1))' },
      }),
    ).toBe('');

    expect(
      buildThemeCssOverrides({
        gradients: { headline: 'linear-gradient(@import "x.css")' },
      }),
    ).toBe('');

    expect(
      buildThemeCssOverrides({
        gradients: { headline: 'linear-gradient(#000, #fff)\\9' },
      }),
    ).toBe('');

    expect(
      buildThemeCssOverrides({
        gradients: { headline: '' },
      }),
    ).toBe('');

    expect(
      buildThemeCssOverrides({
        gradients: {
          headline: `linear-gradient(${'x'.repeat(500)})`,
        },
      }),
    ).toBe('');

    expect(
      buildThemeCssOverrides({
        gradients: {
          headline: 'linear-gradient(url (https://evil.example/x.png))',
        },
      }),
    ).toBe('');
  });

  it('ignores missing gradients/components and unknown or unmapped keys', () => {
    expect(buildThemeCssOverrides({})).toBe('');

    const css = buildThemeCssOverrides({
      gradients: {
        heroBackground: 'radial-gradient(circle, #111 0%, #000 100%)',
        splash: 'linear-gradient(#000, #fff)',
      },
    });
    expect(css).toBe('');
  });

  it('emits only valid fields from a partial heroCta', () => {
    const css = buildThemeCssOverrides({
      components: {
        heroCta: {
          background: '#111111',
          color: '#FFFFFF',
          hoverBackground: '#222222',
          hoverColor: '#EEEEEE',
          borderColor: '#333333',
          padding: '0.75rem 1.5rem',
          fontWeight: '600',
          textTransform: 'uppercase',
        },
      },
    });

    expect(css).toContain('--zb-hero-cta-bg: #111111');
    expect(css).toContain('--zb-hero-cta-color: #FFFFFF');
    expect(css).toContain('--zb-hero-cta-hover-bg: #222222');
    expect(css).toContain('--zb-hero-cta-hover-color: #EEEEEE');
    expect(css).toContain('--zb-hero-cta-border-color: #333333');
    expect(css).toContain('--zb-hero-cta-padding: 0.75rem 1.5rem');
    expect(css).toContain('--zb-hero-cta-font-weight: 600');
    expect(css).toContain('--zb-hero-cta-text-transform: uppercase');
    expect(css).not.toContain('--zb-hero-cta-radius');
  });

  it('drops invalid heroCta color, padding, fontWeight, and textTransform', () => {
    const css = buildThemeCssOverrides({
      components: {
        heroCta: {
          background: 'rgba(0,0,0,1)',
          padding: '10px url(https://evil.example)',
          fontWeight: '600; color: red',
          textTransform: 'inherit',
          borderRadius: '1rem',
        },
      },
    });

    expect(css).toContain('--zb-hero-cta-radius: 1rem');
    expect(css).not.toContain('--zb-hero-cta-bg');
    expect(css).not.toContain('--zb-hero-cta-padding');
    expect(css).not.toContain('--zb-hero-cta-font-weight');
    expect(css).not.toContain('--zb-hero-cta-text-transform');
  });

  it('does not emit components.cta', () => {
    const css = buildThemeCssOverrides({
      components: {
        cta: { background: '#FF0000' },
      },
    });
    expect(css).toBe('');
  });

  it('still emits validated colors and custom properties', () => {
    const css = buildThemeCssOverrides({
      colors: { primary: '#2563EB', secondary: 'red' },
      custom: {
        '--brand-highlight': '#FF5733',
        notAVar: '#fff',
      },
    });

    expect(css).toContain('--color-primary: #2563EB');
    expect(css).not.toContain('--color-secondary');
    expect(css).toContain('--brand-highlight: #FF5733');
    expect(css).not.toContain('notAVar');
  });
});
