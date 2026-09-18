import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CmsPage } from '@/components/cms/CmsPage';
import { CmsPageSkeleton } from '@/components/cms/CmsPageSkeleton';

export const metadata: Metadata = {
  alternates: { canonical: '/about' },
  title: 'About Us',
  description: 'Learn about our mission and our team.',
};

// ISR: CMS-backed content revalidates every 60s (storefront-content-architecture.md)
export const revalidate = 60;

export default function AboutPage() {
  return (
    <Suspense fallback={<CmsPageSkeleton />}>
      <CmsPage
        collection="page"
        slug="about"
        title="About Us"
        subtitle="Learn about our story, mission, and the team behind the products."
      />
    </Suspense>
  );
}
