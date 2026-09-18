import { Suspense } from 'react';
import { AppPackageMounts } from '@/components/apps/AppPackageMounts';
import { HeroBanner } from '@/components/home/HeroBanner';
import { HeroBannerSkeleton } from '@/components/home/HeroBannerSkeleton';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { FeaturedProductsSkeleton } from '@/components/home/FeaturedProductsSkeleton';
import { ValueProps } from '@/components/home/ValueProps';
import { HomepageCmsContent } from '@/components/home/HomepageCmsContent';
import { NewsletterSignup } from '@/components/home/NewsletterSignup';

// ISR: CMS-backed homepage slots revalidate every 60s (storefront-content-architecture.md)
export const revalidate = 60;

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<HeroBannerSkeleton />}>
        <HeroBanner />
      </Suspense>

      <Suspense fallback={<FeaturedProductsSkeleton />}>
        <FeaturedProducts />
      </Suspense>

      <ValueProps />

      {/* Verified build-time app packages (empty when no mounts). */}
      <AppPackageMounts />

      <Suspense fallback={null}>
        <HomepageCmsContent />
      </Suspense>

      <NewsletterSignup />
    </>
  );
}
