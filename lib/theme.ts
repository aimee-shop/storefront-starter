import type {
  ComponentTokenSet,
  ThemeColors,
  ThemeLayout,
  ThemeSettings,
  ThemeSocialLinks,
  ThemeTypography,
} from '@aimee.shop/sdk';

// This module is pure (no data fetching) and safe to import from client
// components. Fetching lives in lib/store-config.ts (server-only).

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

// Theme settings types come from the SDK (frontend--sdk-usage-standard.md:
// import DTO types, never redefine). Re-exported for existing consumers.
export type {
  ThemeBranding,
  ThemeColors,
  ThemeLayout,
  ThemeSettings,
  ThemeSocialLinks,
  ThemeTypography,
} from '@aimee.shop/sdk';

/** Resolved theme with all defaults applied. */
export interface StorefrontTheme {
  colors: Required<ThemeColors>;
  typography: Required<ThemeTypography>;
  layout: Required<ThemeLayout>;
  branding: {
    storeName: string;
    tagline: string;
    logoUrl: string;
    logoAltText: string;
    faviconUrl: string;
    ogImage: string;
    socialLinks: ThemeSocialLinks;
  };
  cssOverrides: string;
  fontUrl: string | null;
}

// ----------------------------------------------------------------
// Defaults (match current hardcoded values in globals.css)
// ----------------------------------------------------------------

const DEFAULT_COLORS: Required<ThemeColors> = {
  primary: '#0066F7',
  secondary: '#FB74C6',
  accent: '#00B2FD',
  dark: '#050A1C',
  light: '#F6F8FC',
  footer: '#0B1226',
  headerBackground: '',
};

const DEFAULT_TYPOGRAPHY: Required<ThemeTypography> = {
  fontFamily: 'Geist',
  headingFontFamily: '',
  baseFontSize: '16px',
  fontSources: [],
};

const DEFAULT_LAYOUT: Required<ThemeLayout> = {
  borderRadius: '0.625rem',
  maxWidth: '80rem',
};

export const FALLBACK_STORE_NAME = 'Acme Store';

const DEFAULT_BRANDING: StorefrontTheme['branding'] = {
  storeName: FALLBACK_STORE_NAME,
  tagline:
    'Quality products for modern living. Trusted by thousands of customers worldwide.',
  // Demo lockup shipped with the starter (public/brand/); merchants override
  // via themeSettings.branding.logoUrl.
  logoUrl: '/brand/aimee-logo-horizontal-onlight.svg',
  logoAltText: 'Aimee',
  faviconUrl: '',
  ogImage: '/brand/aimee-og-card-1200x630.png',
  socialLinks: {},
};

export const DEFAULT_THEME: StorefrontTheme = {
  colors: DEFAULT_COLORS,
  typography: DEFAULT_TYPOGRAPHY,
  layout: DEFAULT_LAYOUT,
  branding: DEFAULT_BRANDING,
  cssOverrides: '',
  fontUrl: null,
};

// ----------------------------------------------------------------
// Validation
// ----------------------------------------------------------------

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
const CSS_SIZE_RE = /^\d+(\.\d+)?(rem|px|em)$/;
const CSS_PADDING_RE =
  /^\d+(\.\d+)?(rem|px|em)(\s+\d+(\.\d+)?(rem|px|em)){0,3}$/;
const FONT_WEIGHT_RE = /^(?:[1-9]00|normal|bold|bolder|lighter)$/;
const TEXT_TRANSFORM_RE = /^(?:none|uppercase|lowercase|capitalize)$/;
const GRADIENT_VALUE_RE = /^(linear|radial|conic)-gradient\(.+\)$/;
const MAX_GRADIENT_LENGTH = 500;

const SAFE_FONT_FAMILIES = new Set([
  'Geist',
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Raleway',
  'Nunito',
  'Source Sans Pro',
  'PT Sans',
  'Merriweather',
  'Playfair Display',
  'Oswald',
  'Libre Baskerville',
]);

const SYSTEM_FONTS = new Set([
  'system-ui',
  'sans-serif',
  'serif',
  'monospace',
]);

function isValidColor(v: unknown): v is string {
  return typeof v === 'string' && HEX_COLOR_RE.test(v);
}

function isValidSize(v: unknown): v is string {
  return typeof v === 'string' && CSS_SIZE_RE.test(v);
}

function isValidFont(v: unknown): v is string {
  return typeof v === 'string' && (SAFE_FONT_FAMILIES.has(v) || SYSTEM_FONTS.has(v));
}

function isValidCustomValue(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 200) return false;
  if (/url\s*\(|expression\s*\(|javascript:|<\/?[a-z]/i.test(v)) return false;
  return true;
}

function isValidPadding(v: unknown): v is string {
  return typeof v === 'string' && CSS_PADDING_RE.test(v);
}

function isValidFontWeight(v: unknown): v is string {
  return typeof v === 'string' && FONT_WEIGHT_RE.test(v);
}

function isValidTextTransform(v: unknown): v is string {
  return typeof v === 'string' && TEXT_TRANSFORM_RE.test(v);
}

function isValidGradient(v: unknown): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > MAX_GRADIENT_LENGTH) {
    return false;
  }
  if (v.includes('\\')) return false;
  if (!GRADIENT_VALUE_RE.test(v)) return false;
  if (/url\s*\(|expression\s*\(|javascript:|@import/i.test(v)) {
    return false;
  }
  return true;
}

// ----------------------------------------------------------------
// CSS generation
// ----------------------------------------------------------------

const COLOR_CSS_MAP: Record<keyof ThemeColors, string> = {
  primary: '--color-primary',
  secondary: '--color-secondary',
  accent: '--color-accent',
  dark: '--color-dark',
  light: '--color-light',
  footer: '--color-footer',
  headerBackground: '--color-header-bg',
};

// Reserved ThemeGradients keys only. heroBackground has no dedicated --zb-*
// gradient token in blocks 0.4.0; do not invent one.
const GRADIENT_CSS_MAP: Record<
  'headline' | 'accent',
  { cssVar: string; fillVar: string }
> = {
  headline: {
    cssVar: '--zb-headline-gradient',
    fillVar: '--zb-headline-text-fill',
  },
  accent: {
    cssVar: '--zb-subheadline-gradient',
    fillVar: '--zb-subheadline-text-fill',
  },
};

const HERO_CTA_FIELDS: Array<{
  field: keyof ComponentTokenSet;
  cssVar: string;
  validate: (v: unknown) => v is string;
}> = [
  { field: 'background', cssVar: '--zb-hero-cta-bg', validate: isValidColor },
  { field: 'color', cssVar: '--zb-hero-cta-color', validate: isValidColor },
  {
    field: 'hoverBackground',
    cssVar: '--zb-hero-cta-hover-bg',
    validate: isValidColor,
  },
  {
    field: 'hoverColor',
    cssVar: '--zb-hero-cta-hover-color',
    validate: isValidColor,
  },
  {
    field: 'borderColor',
    cssVar: '--zb-hero-cta-border-color',
    validate: isValidColor,
  },
  {
    field: 'borderRadius',
    cssVar: '--zb-hero-cta-radius',
    validate: isValidSize,
  },
  { field: 'padding', cssVar: '--zb-hero-cta-padding', validate: isValidPadding },
  {
    field: 'fontWeight',
    cssVar: '--zb-hero-cta-font-weight',
    validate: isValidFontWeight,
  },
  {
    field: 'textTransform',
    cssVar: '--zb-hero-cta-text-transform',
    validate: isValidTextTransform,
  },
];

export function buildThemeCssOverrides(settings: ThemeSettings): string {
  const decls: string[] = [];

  if (settings.colors) {
    for (const [key, cssVar] of Object.entries(COLOR_CSS_MAP)) {
      const value = settings.colors[key as keyof ThemeColors];
      if (isValidColor(value)) {
        decls.push(`${cssVar}: ${value}`);
      }
    }
  }

  if (settings.typography) {
    if (isValidFont(settings.typography.fontFamily)) {
      decls.push(
        `--font-sans: '${settings.typography.fontFamily}', system-ui, sans-serif`,
      );
    }
    if (isValidFont(settings.typography.headingFontFamily)) {
      decls.push(
        `--font-heading: '${settings.typography.headingFontFamily}', system-ui, sans-serif`,
      );
    }
    if (isValidSize(settings.typography.baseFontSize)) {
      decls.push(`font-size: ${settings.typography.baseFontSize}`);
    }
  }

  if (settings.layout) {
    if (isValidSize(settings.layout.borderRadius)) {
      decls.push(`--radius: ${settings.layout.borderRadius}`);
    }
    if (isValidSize(settings.layout.maxWidth)) {
      decls.push(`--max-width: ${settings.layout.maxWidth}`);
    }
  }

  if (settings.gradients) {
    for (const key of Object.keys(GRADIENT_CSS_MAP) as Array<
      keyof typeof GRADIENT_CSS_MAP
    >) {
      const value = settings.gradients[key];
      if (!isValidGradient(value)) continue;
      const { cssVar, fillVar } = GRADIENT_CSS_MAP[key];
      decls.push(`${cssVar}: ${value}`);
      decls.push(`${fillVar}: transparent`);
    }
  }

  if (settings.components?.heroCta) {
    const heroCta = settings.components.heroCta;
    for (const { field, cssVar, validate } of HERO_CTA_FIELDS) {
      const value = heroCta[field];
      if (validate(value)) {
        decls.push(`${cssVar}: ${value}`);
      }
    }
  }

  if (settings.custom) {
    for (const [key, value] of Object.entries(settings.custom)) {
      if (
        /^--[a-zA-Z][a-zA-Z0-9-]*$/.test(key) &&
        isValidCustomValue(value)
      ) {
        decls.push(`${key}: ${value}`);
      }
    }
  }

  if (decls.length === 0) return '';
  return `:root { ${decls.join('; ')} }`;
}

// ----------------------------------------------------------------
// Google Fonts URL for non-Geist fonts
// ----------------------------------------------------------------

export function getFontUrl(fontFamily: string | undefined): string | null {
  if (!fontFamily || fontFamily === 'Geist') return null;
  if (!SAFE_FONT_FAMILIES.has(fontFamily)) return null;
  if (SYSTEM_FONTS.has(fontFamily)) return null;
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap`;
}

// ----------------------------------------------------------------
// Theme resolution (merge API settings with defaults)
// ----------------------------------------------------------------

export function resolveTheme(settings: ThemeSettings | null): StorefrontTheme {
  if (!settings) return DEFAULT_THEME;

  const colors: Required<ThemeColors> = { ...DEFAULT_COLORS };
  if (settings.colors) {
    for (const key of Object.keys(DEFAULT_COLORS) as (keyof ThemeColors)[]) {
      const val = settings.colors[key];
      if (isValidColor(val)) colors[key] = val;
    }
  }

  const typography: Required<ThemeTypography> = { ...DEFAULT_TYPOGRAPHY };
  if (settings.typography) {
    if (isValidFont(settings.typography.fontFamily))
      typography.fontFamily = settings.typography.fontFamily;
    if (isValidFont(settings.typography.headingFontFamily))
      typography.headingFontFamily = settings.typography.headingFontFamily;
    if (isValidSize(settings.typography.baseFontSize))
      typography.baseFontSize = settings.typography.baseFontSize;
  }

  const layout: Required<ThemeLayout> = { ...DEFAULT_LAYOUT };
  if (settings.layout) {
    if (isValidSize(settings.layout.borderRadius))
      layout.borderRadius = settings.layout.borderRadius;
    if (isValidSize(settings.layout.maxWidth))
      layout.maxWidth = settings.layout.maxWidth;
  }

  const branding: StorefrontTheme['branding'] = {
    storeName: settings.branding?.storeName || DEFAULT_BRANDING.storeName,
    tagline: settings.branding?.tagline || DEFAULT_BRANDING.tagline,
    logoUrl: settings.branding?.logoUrl || DEFAULT_BRANDING.logoUrl,
    logoAltText: settings.branding?.logoAltText || DEFAULT_BRANDING.logoAltText,
    faviconUrl: settings.branding?.faviconUrl || DEFAULT_BRANDING.faviconUrl,
    ogImage: settings.branding?.ogImage || DEFAULT_BRANDING.ogImage,
    socialLinks: settings.branding?.socialLinks ?? DEFAULT_BRANDING.socialLinks,
  };

  return {
    colors,
    typography,
    layout,
    branding,
    cssOverrides: buildThemeCssOverrides(settings),
    fontUrl: getFontUrl(typography.fontFamily),
  };
}

