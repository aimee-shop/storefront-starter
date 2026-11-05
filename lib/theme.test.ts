import { describe, expect, it } from 'vitest';
import { FALLBACK_STORE_NAME, buildThemeCssOverrides, getFontUrl, resolveTheme } from './theme';

describe('buildThemeCssOverrides', () => {
  it('emits locked gradient tokens for valid linear/radial/conic values', () => {
    const css = buildThemeCssOverrides({
      gradients: {
        headline: 'linear-gradient(90deg, #FF5733, #00AA88)',
        accent: 'radial-gradient(circle, #111 0%, #000 100%)',
      },
    });

    expect(css).toContain(
      '--aimee-headline-gradient: linear-gradient(90deg, #FF5733, #00AA88)',
    );
    expect(css).toContain('--aimee-headline-text-fill: transparent');
    expect(css).toContain(
      '--aimee-subheadline-gradient: radial-gradient(circle, #111 0%, #000 100%)',
    );
    expect(css).toContain('--aimee-subheadline-text-fill: transparent');
  });

  it('emits a conic headline gradient with the fill pair', () => {
    const css = buildThemeCssOverrides({
      gradients: {
        headline: 'conic-gradient(from 90deg, #000, #fff)',
      },
    });

    expect(css).toContain(
      '--aimee-headline-gradient: conic-gradient(from 90deg, #000, #fff)',
    );
    expect(css).toContain('--aimee-headline-text-fill: transparent');
    expect(css).not.toContain('--aimee-subheadline-gradient');
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

    expect(css).toContain('--aimee-hero-cta-bg: #111111');
    expect(css).toContain('--aimee-hero-cta-color: #FFFFFF');
    expect(css).toContain('--aimee-hero-cta-hover-bg: #222222');
    expect(css).toContain('--aimee-hero-cta-hover-color: #EEEEEE');
    expect(css).toContain('--aimee-hero-cta-border-color: #333333');
    expect(css).toContain('--aimee-hero-cta-padding: 0.75rem 1.5rem');
    expect(css).toContain('--aimee-hero-cta-font-weight: 600');
    expect(css).toContain('--aimee-hero-cta-text-transform: uppercase');
    expect(css).not.toContain('--aimee-hero-cta-radius');
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

    expect(css).toContain('--aimee-hero-cta-radius: 1rem');
    expect(css).not.toContain('--aimee-hero-cta-bg');
    expect(css).not.toContain('--aimee-hero-cta-padding');
    expect(css).not.toContain('--aimee-hero-cta-font-weight');
    expect(css).not.toContain('--aimee-hero-cta-text-transform');
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

  it('derives the primary hover from a valid merchant primary only', () => {
    expect(buildThemeCssOverrides({ colors: { primary: '#C2410C' } })).toContain(
      '--color-primary-hover: color-mix(in oklab, #C2410C, black 15%)',
    );
    expect(
      buildThemeCssOverrides({ colors: { primary: 'red', accent: '#00B2FD' } }),
    ).not.toContain('--color-primary-hover');
  });

  it('emits typography and layout, and drops unsafe custom values', () => {
    const css = buildThemeCssOverrides({
      typography: {
        fontFamily: 'Inter',
        headingFontFamily: 'serif',
        baseFontSize: '18px',
      },
      layout: { borderRadius: '0.5rem', maxWidth: '72rem' },
      custom: {
        '--ok': '1rem',
        '--bad': 'url(https://evil.example/x)',
        '--html': '<script>',
        '--long': 'x'.repeat(201),
      },
    });

    expect(css).toContain("--font-sans: 'Inter'");
    expect(css).toContain("--font-heading: 'serif'");
    expect(css).toContain('font-size: 18px');
    expect(css).toContain('--radius: 0.5rem');
    expect(css).toContain('--max-width: 72rem');
    expect(css).toContain('--ok: 1rem');
    expect(css).not.toContain('--bad');
    expect(css).not.toContain('--html');
    expect(css).not.toContain('--long');
  });

  it('drops invalid typography and layout', () => {
    const css = buildThemeCssOverrides({
      typography: {
        fontFamily: 'Comic Sans',
        headingFontFamily: '',
        baseFontSize: 'huge',
      },
      layout: { borderRadius: '10', maxWidth: 'full' },
    });
    expect(css).toBe('');
  });
});

describe('getFontUrl', () => {
  it('returns a stylesheet only for an allowlisted non-Geist family', () => {
    expect(getFontUrl(undefined)).toBeNull();
    expect(getFontUrl('')).toBeNull();
    expect(getFontUrl('Geist')).toBeNull();
    expect(getFontUrl('Comic Sans')).toBeNull();
    expect(getFontUrl('system-ui')).toBeNull();
    expect(getFontUrl('Inter')).toContain('fonts.googleapis.com');
    expect(getFontUrl('Inter')).toContain('Inter');
  });
});

describe('resolveTheme', () => {
  it('returns the default theme when settings are missing', () => {
    const theme = resolveTheme(null);
    expect(theme.branding.storeName).toBe(FALLBACK_STORE_NAME);
    expect(theme.colors.primary).toBe('#0066F7');
    expect(theme.fontUrl).toBeNull();
    expect(theme.cssOverrides).toBe('');
  });

  it('keeps valid overrides and falls back field by field', () => {
    const themed = resolveTheme({
      colors: {
        primary: '#112233',
        secondary: 'red',
        accent: '#abc',
        dark: '#000000',
        light: '#ffffff',
        footer: '#010101',
        headerBackground: '#222222',
      },
      typography: {
        fontFamily: 'Inter',
        headingFontFamily: 'Playfair Display',
        baseFontSize: '18px',
      },
      layout: { borderRadius: '0.5rem', maxWidth: '72rem' },
      branding: {
        storeName: 'Hat Co',
        tagline: 'Hats',
        logoUrl: '/logo.svg',
        logoAltText: 'Hat',
        faviconUrl: '/fav.ico',
        ogImage: '/og.png',
        socialLinks: { instagram: 'https://instagram.com/hat' },
      },
    });
    expect(themed.colors.primary).toBe('#112233');
    expect(themed.colors.secondary).toBe('#FB74C6');
    expect(themed.typography.fontFamily).toBe('Inter');
    expect(themed.typography.headingFontFamily).toBe('Playfair Display');
    expect(themed.layout.borderRadius).toBe('0.5rem');
    expect(themed.branding.storeName).toBe('Hat Co');
    expect(themed.branding.socialLinks.instagram).toBe('https://instagram.com/hat');
    expect(themed.fontUrl).toContain('Inter');
    expect(themed.cssOverrides).toContain('--color-primary: #112233');

    const fallback = resolveTheme({
      typography: { fontFamily: 'nope', headingFontFamily: '', baseFontSize: 'huge' },
      layout: { borderRadius: '10', maxWidth: 'full' },
      branding: {},
    });
    expect(fallback.typography.fontFamily).toBe('Geist');
    expect(fallback.layout.maxWidth).toBe('80rem');
    expect(fallback.branding.storeName).toBe(FALLBACK_STORE_NAME);
    expect(fallback.branding.socialLinks).toEqual({});
    expect(fallback.fontUrl).toBeNull();
  });
});
