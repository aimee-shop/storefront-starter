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

function statusVariant(status: OrderStatus): 'default' | 'secondary' | 'destructive' {
  if (status === 'cancelled' || status === 'refunded') return 'destructive';
  if (status === 'delivered' || status === 'completed') return 'default';
  return 'secondary';
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={statusVariant(status)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
