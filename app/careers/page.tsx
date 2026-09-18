import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CmsPage } from '@/components/cms/CmsPage';
import { CmsPageSkeleton } from '@/components/cms/CmsPageSkeleton';

export const metadata: Metadata = {
  alternates: { canonical: '/careers' },
  title: 'Careers',
  description: 'Join our team. See open positions and opportunities.',
};

// ISR: CMS-backed content revalidates every 60s (storefront-content-architecture.md)
export const revalidate = 60;

export default function CareersPage() {
  return (
    <Suspense fallback={<CmsPageSkeleton />}>
      <CmsPage
        collection="page"
        slug="careers"
        title="Careers"
        subtitle="Join our growing team and help shape the future of modern commerce."
      />
    </Suspense>
  );
}
