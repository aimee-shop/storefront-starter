import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CmsPage } from '@/components/cms/CmsPage';
import { CmsPageSkeleton } from '@/components/cms/CmsPageSkeleton';

export const metadata: Metadata = {
  alternates: { canonical: '/shipping' },
  title: 'Shipping Information',
  description: 'Shipping policies, delivery times, and tracking information.',
};

// ISR: CMS-backed content revalidates every 60s (storefront-content-architecture.md)
export const revalidate = 60;

export default function ShippingPage() {
  return (
    <Suspense fallback={<CmsPageSkeleton />}>
      <CmsPage
        collection="page"
        slug="shipping"
        title="Shipping Information"
        subtitle="Everything you need to know about our shipping policies and delivery."
      />
    </Suspense>
  );
}
