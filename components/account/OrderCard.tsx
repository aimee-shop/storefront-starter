import Link from 'next/link';
import type { StorefrontOrder } from '@aimee.shop/sdk';
import { formatDate, formatMoney } from '@/lib/format';
import { OrderStatusBadge } from './OrderStatusBadge';

/**
 * One row in the customer's order-history list. Links to the order detail
 * page by order number (orders without a number cannot be linked -- render
 * the row inert in that edge case).
 */
export function OrderCard({ order }: { order: StorefrontOrder }) {
  const itemCount = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
  const currency = order.currency ?? 'USD';

  const body = (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <p className="font-medium">
          {order.orderNumber ?? `Order ${order.id.slice(0, 8)}`}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {formatDate(order.createdAt)} &middot; {itemCount}{' '}
          {itemCount === 1 ? 'item' : 'items'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <OrderStatusBadge status={order.status} />
        <span className="font-medium">
          {formatMoney(order.totalAmount, currency)}
        </span>
      </div>
    </div>
  );

  if (!order.orderNumber) {
    return <div className="rounded-lg border p-4 sm:p-5">{body}</div>;
  }

  return (
    <Link
      href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
      className="block rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:p-5"
    >
      {body}
    </Link>
  );
}
