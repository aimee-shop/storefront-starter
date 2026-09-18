import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cart',
  description: 'Review the items in your cart and proceed to checkout.',
  alternates: { canonical: '/cart' },
  robots: { index: false, follow: true },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
