import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CmsPage } from '@/components/cms/CmsPage';
import { CmsPageSkeleton } from '@/components/cms/CmsPageSkeleton';
import { ContactForm } from '@/components/contact/ContactForm';

export const metadata: Metadata = {
  alternates: { canonical: '/contact' },
  title: 'Contact Us',
  description: 'Get in touch with our team. We\'d love to hear from you.',
};

// ISR: CMS-backed content revalidates every 60s (storefront-content-architecture.md)
export const revalidate = 60;

export default function ContactPage() {
  return (
    <Suspense fallback={<CmsPageSkeleton />}>
      <CmsPage
        collection="page"
        slug="contact"
        title="Contact Us"
        subtitle="Have a question or feedback? We'd love to hear from you."
      >
        <div className="mt-12">
          <ContactForm />
        </div>
      </CmsPage>
    </Suspense>
  );
}
