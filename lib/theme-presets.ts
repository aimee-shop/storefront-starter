import type { ThemeSettings } from './theme';

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  settings: ThemeSettings;
}

export const PRESET_MINIMAL: ThemePreset = {
  id: 'minimal',
  name: 'Minimal',
  description:
    'Clean and understated. Generous whitespace, monochromatic palette with a single accent color.',
  settings: {
    colors: {
      primary: '#18181B',
      secondary: '#71717A',
      accent: '#2563EB',
      dark: '#09090B',
      light: '#FAFAFA',
      footer: '#18181B',
      headerBackground: '#FFFFFF',
    },
    typography: {
      fontFamily: 'Inter',
      headingFontFamily: 'Inter',
      baseFontSize: '16px',
    },
    layout: {
      borderRadius: '0.375rem',
      maxWidth: '72rem',
    },
    branding: {
      storeName: 'Studio',
      tagline: 'Considered design for everyday objects.',
    },
  },
};

export const PRESET_BOLD: ThemePreset = {
  id: 'bold',
  name: 'Bold',
  description:
    'High contrast and energetic. Saturated colors, strong typography, and rounded shapes.',
  settings: {
    colors: {
      primary: '#DC2626',
      secondary: '#7C3AED',
      accent: '#FACC15',
      dark: '#0F172A',
      light: '#F8FAFC',
      footer: '#0F172A',
    },
    typography: {
      fontFamily: 'Montserrat',
      headingFontFamily: 'Oswald',
      baseFontSize: '16px',
    },
    layout: {
      borderRadius: '1rem',
      maxWidth: '80rem',
    },
    branding: {
      storeName: 'Maverick',
      tagline: 'Stand out. Be bold. Own it.',
    },
  },
};

export const PRESET_WARM: ThemePreset = {
  id: 'warm',
  name: 'Warm',
  description:
    'Earthy and approachable. Warm tones, serif headings, and a handcrafted feel.',
  settings: {
    colors: {
      primary: '#92400E',
      secondary: '#B45309',
      accent: '#059669',
      dark: '#422006',
      light: '#FFFBEB',
      footer: '#422006',
      headerBackground: '#FFFBEB',
    },
    typography: {
      fontFamily: 'Lato',
      headingFontFamily: 'Playfair Display',
      baseFontSize: '16px',
    },
    layout: {
      borderRadius: '0.5rem',
      maxWidth: '76rem',
    },
    branding: {
      storeName: 'Hearthstone',
      tagline: 'Handcrafted goods rooted in tradition.',
    },
  },
};

/**
 * Dark preset inverts the semantic meaning of --color-dark (text) and
 * --color-light (background). The preview component handles body background
 * overrides automatically. For production use, merchants should also update
 * globals.css body background to use var(--color-light).
 */
export const PRESET_DARK: ThemePreset = {
  id: 'dark',
  name: 'Dark',
  description:
    'Modern dark mode. Deep backgrounds, glowing accents, and a tech-forward aesthetic.',
  settings: {
    colors: {
      primary: '#6366F1',
      secondary: '#EC4899',
      accent: '#22D3EE',
      dark: '#E2E8F0',
      light: '#0F172A',
      footer: '#020617',
      headerBackground: '#0F172A',
    },
    typography: {
      fontFamily: 'Inter',
      headingFontFamily: 'Raleway',
      baseFontSize: '16px',
    },
    layout: {
      borderRadius: '0.75rem',
      maxWidth: '80rem',
    },
    branding: {
      storeName: 'Nocturn',
      tagline: 'Technology meets design. After dark.',
    },
  },
};

export const THEME_PRESETS: ThemePreset[] = [
  PRESET_MINIMAL,
  PRESET_BOLD,
  PRESET_WARM,
  PRESET_DARK,
];

export function getPresetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}
