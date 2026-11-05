import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { PromoBar } from '@/components/layout/PromoBar';
import { Footer } from '@/components/layout/Footer';
import { AppScriptMounts } from '@/components/apps/AppScriptMounts';
import { getStorefrontTheme } from '@/lib/store-config';
import { getEnabledStoreMarkets } from '@/lib/store-markets';
import { config } from '@/lib/config';
import { getAiDiscoveryJsonLd } from '@/lib/ai-discovery';
import { isSandboxNoindex } from '@/lib/robots-policy';
import './globals.css';
import '@aimee.shop/blocks/styles.css';
import { Geist, Quicksand } from 'next/font/google';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
// Heading face from the brand standard; globals.css builds --font-heading on it.
const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-quicksand',
});

export async function generateMetadata(): Promise<Metadata> {
  const theme = await getStorefrontTheme();
  const { storeName, tagline, ogImage, faviconUrl } = theme.branding;

  return {
    // Resolves relative canonical/og URLs below and on child pages. A relative
    // canonical resolves against this base, NOT the current pathname, so each
    // indexable page sets its own; this '/' is the homepage's (app/page.tsx
    // has no metadata export of its own).
    metadataBase: new URL(config.siteUrl),
    alternates: { canonical: '/' },
    title: {
      template: `%s | ${storeName}`,
      default: storeName,
    },
    description: tagline,
    ...(ogImage && { openGraph: { images: [ogImage] } }),
    // Default icon/favicon live under app/ (file conventions). Theme branding
    // may override with an absolute faviconUrl when the merchant sets one.
    ...(faviconUrl
      ? { icons: { icon: faviconUrl } }
      : {}),
    ...(isSandboxNoindex({
      NEXT_PUBLIC_NOINDEX: config.noindexFlag,
      NEXT_PUBLIC_AIMEE_ENV: config.aimeeEnv,
    })
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, markets, jsonLd] = await Promise.all([
    getStorefrontTheme(),
    getEnabledStoreMarkets(),
    getAiDiscoveryJsonLd(),
  ]);
  const useDefaultFont = !theme.fontUrl;

  return (
    <html
      lang="en"
      className={cn(
        'font-sans',
        quicksand.variable,
        useDefaultFont && geist.variable,
      )}
    >
      <head>
        {theme.cssOverrides && <style>{theme.cssOverrides}</style>}
        {theme.fontUrl && (
          <link rel="stylesheet" href={theme.fontUrl} />
        )}
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
      </head>
      <body className="flex min-h-screen flex-col">
        <PromoBar />
        <Header
          storeName={theme.branding.storeName}
          logoUrl={theme.branding.logoUrl}
          logoAlt={theme.branding.logoAltText}
          markets={markets}
        />
        <main className="flex-1">{children}</main>
        <Footer branding={theme.branding} />
        <AppScriptMounts />
      </body>
    </html>
  );
}
