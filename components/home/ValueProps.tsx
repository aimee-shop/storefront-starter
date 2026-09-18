import { Truck, Shield, RotateCcw, Headphones } from 'lucide-react';

const values = [
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'Free shipping on orders over $50. Fast, reliable delivery.',
  },
  {
    icon: Shield,
    title: 'Warranty',
    description: 'Every product backed by our comprehensive warranty.',
  },
  {
    icon: RotateCcw,
    title: 'Easy Returns',
    description: '30-day hassle-free return policy. No questions asked.',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Expert support available around the clock.',
  },
];

export function ValueProps() {
  return (
    <section className="border-y bg-muted/50 py-12 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value) => (
            <div key={value.title} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
                <value.icon className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{value.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
