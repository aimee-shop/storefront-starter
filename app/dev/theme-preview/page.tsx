import type { Metadata } from 'next';
import { ThemePreviewClient } from '@/components/dev/ThemePreviewClient';

export const metadata: Metadata = {
  alternates: { canonical: '/dev/theme-preview' },
  title: 'Theme Preview',
  description:
    'Preview built-in theme presets. Developer tool -- remove before production.',
  robots: { index: false, follow: false },
};

export default function ThemePreviewPage() {
  return <ThemePreviewClient />;
}
