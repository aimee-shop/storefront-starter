import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CmsPage } from '@/components/cms/CmsPage';
import { CmsPageSkeleton } from '@/components/cms/CmsPageSkeleton';

export const metadata: Metadata = {
  alternates: { canonical: '/help' },
  title: 'Help Center',
  description: 'Find answers to common questions and get support.',
};

// ISR: CMS-backed content revalidates every 60s (storefront-content-architecture.md)
export const revalidate = 60;

export default function HelpPage() {
  return (
    <Suspense fallback={<CmsPageSkeleton />}>
      <CmsPage
        collection="page"
        slug="help"
        title="Help Center"
        subtitle="Find answers to common questions and get the support you need."
      />
    </Suspense>
  );
}
