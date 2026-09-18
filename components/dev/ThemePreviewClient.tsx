'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ValueProps } from '@/components/home/ValueProps';
import { NewsletterSignup } from '@/components/home/NewsletterSignup';
import {
  THEME_PRESETS,
  type ThemePreset,
} from '@/lib/theme-presets';
import { buildThemeCssOverrides, getFontUrl } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';

const STYLE_ID = 'theme-preview-override';
const FONT_LINK_PREFIX = 'theme-preview-font-';

function isDarkPreset(preset: ThemePreset): boolean {
  const light = preset.settings.colors?.light;
  if (!light) return false;
  // Simple luminance check: if the "light" color is dark, this is a dark theme
  const hex = light.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

function injectFonts(preset: ThemePreset): HTMLLinkElement[] {
  const links: HTMLLinkElement[] = [];
  const fonts = new Set<string>();

  const bodyFont = preset.settings.typography?.fontFamily;
  const headingFont = preset.settings.typography?.headingFontFamily;

  if (bodyFont) fonts.add(bodyFont);
  if (headingFont && headingFont !== bodyFont) fonts.add(headingFont);

  let i = 0;
  for (const font of fonts) {
    const url = getFontUrl(font);
    if (!url) continue;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.id = `${FONT_LINK_PREFIX}${i++}`;
    document.head.appendChild(link);
    links.push(link);
  }

  return links;
}

const MOCK_PRODUCTS = [
  { name: 'Classic Everyday Tee', price: '$38.00', tag: null },
  { name: 'Weekend Travel Bag', price: '$125.00', tag: 'Sale' },
  { name: 'Minimal Desk Lamp', price: '$89.00', tag: 'New' },
];

export function ThemePreviewClient() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activePreset = activeId
    ? THEME_PRESETS.find((p) => p.id === activeId) ?? null
    : null;

  const applyPreset = useCallback((preset: ThemePreset | null) => {
    // Remove previous overrides
    document.getElementById(STYLE_ID)?.remove();
    document
      .querySelectorAll(`[id^="${FONT_LINK_PREFIX}"]`)
      .forEach((el) => el.remove());

    if (!preset) return;

    // Build and inject CSS overrides
    let css = buildThemeCssOverrides(preset.settings);

    // For dark presets, also override body background/color
    if (isDarkPreset(preset)) {
      const bg = preset.settings.colors?.light ?? '#0F172A';
      const fg = preset.settings.colors?.dark ?? '#E2E8F0';
      css += ` body { background: ${bg} !important; color: ${fg} !important; }`;
    }

    if (css) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = css;
      document.head.appendChild(style);
    }

    // Inject font links
    injectFonts(preset);
  }, []);

  useEffect(() => {
    applyPreset(activePreset);
    return () => {
      document.getElementById(STYLE_ID)?.remove();
      document
        .querySelectorAll(`[id^="${FONT_LINK_PREFIX}"]`)
        .forEach((el) => el.remove());
    };
  }, [activePreset, applyPreset]);

  async function handleCopy() {
    if (!activePreset) return;
    await navigator.clipboard.writeText(
      JSON.stringify(activePreset.settings, null, 2),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const brandName =
    activePreset?.settings.branding?.storeName ?? 'Acme Store';
  const brandTagline =
    activePreset?.settings.branding?.tagline ??
    'Quality products for modern living.';
  const colors = activePreset?.settings.colors;

  return (
    <div className="min-h-screen">
      {/* Preset selector bar */}
      <div className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <span className="mr-2 text-sm font-medium text-muted-foreground">
            Theme:
          </span>
          <Button
            variant={activeId === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveId(null)}
          >
            Default
          </Button>
          {THEME_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              variant={activeId === preset.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveId(preset.id)}
            >
              <span
                className="mr-1.5 inline-block h-3 w-3 rounded-full border"
                style={{
                  backgroundColor: preset.settings.colors?.primary,
                }}
              />
              {preset.name}
            </Button>
          ))}
          {activePreset && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Copy className="mr-1.5 h-3.5 w-3.5" />
              )}
              {copied ? 'Copied!' : 'Copy Settings JSON'}
            </Button>
          )}
        </div>
        {activePreset && (
          <div className="border-t bg-muted/30 px-4 py-2 text-sm text-muted-foreground sm:px-6 lg:px-8">
            <span className="mx-auto block max-w-7xl">
              {activePreset.description}
            </span>
          </div>
        )}
      </div>

      {/* Hero section */}
      <section
        className="relative py-20 sm:py-28"
        style={{
          backgroundColor: colors?.dark ?? 'var(--color-dark)',
          color: colors?.light ?? 'var(--color-light)',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            {brandName}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg opacity-80">
            {brandTagline}
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <button
              className="rounded-[var(--radius,0.625rem)] px-8 py-3 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: colors?.primary ?? 'var(--color-primary)',
                color: '#FFFFFF',
              }}
            >
              Shop Now
            </button>
            <button
              className="rounded-[var(--radius,0.625rem)] border border-current px-8 py-3 text-sm font-semibold transition-colors"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Color swatches */}
      {colors && (
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-6 text-lg font-semibold">Color Palette</h2>
            <div className="flex flex-wrap gap-6">
              {(
                [
                  ['Primary', colors.primary],
                  ['Secondary', colors.secondary],
                  ['Accent', colors.accent],
                  ['Dark', colors.dark],
                  ['Light', colors.light],
                  ['Footer', colors.footer],
                  ['Header BG', colors.headerBackground],
                ] as const
              )
                .filter(([, val]) => val)
                .map(([label, value]) => (
                  <div key={label} className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full border shadow-sm"
                      style={{ backgroundColor: value }}
                    />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Typography specimen */}
      <section className="border-y py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-lg font-semibold">Typography</h2>
          <div className="space-y-4">
            <p className="text-3xl font-bold">
              The quick brown fox jumps over the lazy dog
            </p>
            <p className="text-xl">
              Pack my box with five dozen liquor jugs.
            </p>
            <p className="text-base text-muted-foreground">
              Body text at the configured base font size. This demonstrates how
              readable paragraph content will appear with this theme&apos;s font
              family and sizing choices.
            </p>
            {activePreset?.settings.typography && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Body:{' '}
                {activePreset.settings.typography.fontFamily ?? 'Geist'}
                {activePreset.settings.typography.headingFontFamily &&
                  activePreset.settings.typography.headingFontFamily !==
                    activePreset.settings.typography.fontFamily &&
                  ` / Headings: ${activePreset.settings.typography.headingFontFamily}`}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Mock product cards */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="mb-8 text-2xl font-bold tracking-tight">
            Featured Products
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {MOCK_PRODUCTS.map((product) => (
              <div
                key={product.name}
                className={cn(
                  'group block rounded-xl border border-transparent',
                  'transition-all duration-200 hover:border-border hover:shadow-md',
                )}
              >
                <div className="relative overflow-hidden rounded-t-xl bg-muted">
                  <div className="flex aspect-[4/5] items-center justify-center text-muted-foreground/60">
                    <svg
                      className="h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                      />
                    </svg>
                  </div>
                  {product.tag && (
                    <Badge
                      variant={
                        product.tag === 'Sale' ? 'destructive' : 'default'
                      }
                      className="absolute left-3 top-3 shadow-sm"
                    >
                      {product.tag}
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="line-clamp-2 text-[0.925rem] font-medium leading-snug">
                    {product.name}
                  </h3>
                  <div className="mt-2">
                    <span className="text-base font-semibold">
                      {product.price}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value props (real component) */}
      <ValueProps />

      {/* Newsletter signup (real component) */}
      <NewsletterSignup />

      {/* Footer strip preview */}
      <section
        className="py-12"
        style={{
          backgroundColor: colors?.footer ?? 'var(--color-footer)',
          color: '#FFFFFF',
        }}
      >
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-lg font-semibold">{brandName}</p>
          <p className="mt-2 text-sm opacity-60">{brandTagline}</p>
          <p className="mt-6 text-xs opacity-40">
            Footer area preview -- demonstrates footer background color
          </p>
        </div>
      </section>
    </div>
  );
}
