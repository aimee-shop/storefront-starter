import type { OrderStatus } from '@aimee.shop/sdk';
import { Badge } from '@/components/ui/badge';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  partially_shipped: 'Partially shipped',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' {
  if (status === 'cancelled' || status === 'refunded') return 'destructive';
  if (status === 'delivered' || status === 'completed') return 'default';
  return 'secondary';
}

// Storefront orders carry status as a plain string; unknown values render as-is.
export function OrderStatusBadge({ status }: { status: OrderStatus | string }) {
  return (
    <Badge variant={statusVariant(status)}>
      {STATUS_LABELS[status as OrderStatus] ?? status}
    </Badge>
  );
}
