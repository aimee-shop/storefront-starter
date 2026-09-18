'use client';

import type { CheckoutSession, TotalsBreakdown } from '@aimee.shop/sdk';
import { formatMoney } from '@/lib/format';
import { Separator } from '@/components/ui/separator';

type SummarySource = Pick<
  TotalsBreakdown | CheckoutSession,
  'subtotal' | 'shippingTotal' | 'taxTotal' | 'discountTotal' | 'total' | 'currency'
>;

export function CheckoutOrderSummary({
  totals,
  session,
  shippingSelected = false,
}: {
  totals: TotalsBreakdown | null;
  session: CheckoutSession | null;
  /** When false, shipping line shows pending copy instead of $0.00. */
  shippingSelected?: boolean;
}) {
  const source: SummarySource | null = totals ?? session;
  if (!source) return null;

  const currency = source.currency ?? session?.currency ?? 'USD';
  const discount = Number(source.discountTotal ?? 0);
  const hasShippingAmount =
    shippingSelected || Number(source.shippingTotal ?? 0) > 0;

  return (
    <section className="mt-8" aria-labelledby="checkout-totals-heading">
      <h2 id="checkout-totals-heading" className="text-lg font-semibold">
        Order summary
      </h2>
      <dl className="mt-4 space-y-2 rounded-lg border p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{formatMoney(source.subtotal, currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd>
            {hasShippingAmount
              ? formatMoney(source.shippingTotal, currency)
              : 'Select a method'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax</dt>
          <dd>{formatMoney(source.taxTotal, currency)}</dd>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Discount</dt>
            <dd>-{formatMoney(source.discountTotal, currency)}</dd>
          </div>
        )}
        <Separator className="my-2" />
        <div className="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd>{formatMoney(source.total, currency)}</dd>
        </div>
      </dl>
    </section>
  );
}
