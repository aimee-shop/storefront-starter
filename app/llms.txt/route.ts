import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { THEME_PRESETS } from '@/lib/theme-presets';

/**
 * Proxy route for llms.txt - serves AI discovery metadata for crawlers.
 *
 * Proxies to: GET /v1/public/stores/:storeId/llms.txt on Core API
 * The backend generates markdown with store info, categories, and featured products.
 * The storefront appends theme preset metadata for AI toolkit discovery.
 *
 * Intentionally uses a raw fetch rather than the @/lib/sdk client: this is a
 * plain-text public endpoint with no corresponding SDK method (the SDK exposes
 * JSON resources only). Update this URL if the Core API route changes.
 *
 * Cache: 1 hour (matches backend cache-control header)
 */
export async function GET(): Promise<NextResponse> {
  const { coreApiUrl, storeId } = config;

  if (!coreApiUrl || !storeId) {
    return new NextResponse('Configuration error', { status: 500 });
  }

  try {
    const response = await fetch(
      `${coreApiUrl}/v1/public/stores/${storeId}/llms.txt`,
      { next: { revalidate: 3600 } } // 1-hour ISR cache
    );

    if (!response.ok) {
      return new NextResponse('Not found', { status: 404 });
    }

    const content = await response.text();
    const withPresets = content + '\n\n' + buildPresetSection();

    return new NextResponse(withPresets, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[llms.txt] failed to proxy Core API:', error);
    return new NextResponse('Service unavailable', { status: 503 });
  }
}

function buildPresetSection(): string {
  const lines = [
    '## Theme Presets',
    '',
    'This storefront supports theme presets that change colors, typography, and layout.',
    'Preview at /dev/theme-preview. Apply via Store Configuration API (themeSettings).',
    '',
  ];

  for (const preset of THEME_PRESETS) {
    const colors = preset.settings.colors;
    const typo = preset.settings.typography;
    lines.push(`### ${preset.name}`);
    lines.push(preset.description);
    lines.push(
      `- Colors: primary ${colors?.primary}, secondary ${colors?.secondary}, accent ${colors?.accent}`,
    );
    lines.push(
      `- Typography: ${typo?.fontFamily ?? 'Geist'}${typo?.headingFontFamily ? ` / ${typo.headingFontFamily}` : ''}`,
    );
    lines.push(
      `- Layout: border-radius ${preset.settings.layout?.borderRadius}`,
    );
    lines.push(`- ThemeSettings: ${JSON.stringify(preset.settings)}`);
    lines.push('');
  }

  return lines.join('\n');
}
