import type { OrderTimelineEvent } from '@aimee.shop/sdk';
import { formatDate } from '@/lib/format';

/**
 * Vertical status timeline for the order detail page. Events are rendered
 * newest-first regardless of API order.
 */
export function OrderTimeline({ events }: { events: OrderTimelineEvent[] }) {
  if (events.length === 0) return null;

  const sorted = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <ol className="space-y-4">
      {sorted.map((event) => (
        <li key={event.id} className="relative flex gap-3">
          <span
            aria-hidden="true"
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
          />
          <div className="min-w-0">
            <p className="text-sm">{event.description}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDate(event.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
