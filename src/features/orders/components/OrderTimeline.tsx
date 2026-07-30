import type { OrderTimelineEntryDto } from "@/lib/order-client";

import { OrderStatusBadge } from "./OrderStatusBadge";

/** Server order is already correct (Sprint 5.3's own `OrderTimelineEntry.Sequence` fix — see `OrderTotals.cs`/`OrderConfiguration.cs`'s own comments for the real EF Core bug that made a naive timestamp sort unreliable), never re-sorted here. */
export function OrderTimeline({ entries }: { entries: OrderTimelineEntryDto[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry, index) => (
        <li key={`${entry.status}-${index}`} className="flex items-start gap-3">
          <div className="flex flex-col items-center pt-0.5">
            <span className="bg-brand-accent-500 size-2 shrink-0 rounded-full" aria-hidden="true" />
            {index < entries.length - 1 && <span className="bg-border mt-1 h-full w-px flex-1" aria-hidden="true" />}
          </div>
          <div className="flex flex-1 flex-col gap-0.5 pb-3">
            <div className="flex items-center gap-2">
              <OrderStatusBadge status={entry.status} />
              <time dateTime={entry.occurredAtUtc} className="text-muted-foreground text-xs">
                {new Date(entry.occurredAtUtc).toLocaleString()}
              </time>
            </div>
            {entry.note && <p className="text-muted-foreground text-sm">{entry.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
