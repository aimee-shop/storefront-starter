import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CmsPage } from '@/components/cms/CmsPage';
import { CmsPageSkeleton } from '@/components/cms/CmsPageSkeleton';

export const metadata: Metadata = {
  alternates: { canonical: '/returns' },
  title: 'Returns & Exchanges',
  description: 'Our return and exchange policy, including how to start a return.',
};

// ISR: CMS-backed content revalidates every 60s (storefront-content-architecture.md)
export const revalidate = 60;

export default function ReturnsPage() {
  return (
    <Suspense fallback={<CmsPageSkeleton />}>
      <CmsPage
        collection="page"
        slug="returns"
        title="Returns & Exchanges"
        subtitle="Our hassle-free return and exchange policy."
      />
    </Suspense>
  );
}
