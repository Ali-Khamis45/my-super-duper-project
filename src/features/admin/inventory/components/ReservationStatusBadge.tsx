import { Badge } from "@/components/ui/badge";
import type { InventoryReservationStatusValue } from "@/lib/inventory-client";

/** Mirrors `Coffeshop.Domain.Inventory.InventoryReservationStatus` exactly — plain lowercase on the wire (every member is a single word, unlike `InventoryStatus`). A separate badge from `InventoryStatusBadge`, not a shared/generic one — the two enums describe genuinely different domain concepts (an item's stock health vs. one hold's own lifecycle), the same "one mapping per real status concept" precedent `OrderStatusBadge`'s own doc comment establishes. */
const STATUS_LABEL: Record<InventoryReservationStatusValue, string> = {
  active: "Active",
  consumed: "Consumed",
  released: "Released",
  expired: "Expired",
};

const STATUS_VARIANT: Record<InventoryReservationStatusValue, "default" | "secondary" | "outline" | "destructive"> = {
  active: "secondary",
  consumed: "default",
  released: "outline",
  expired: "outline",
};

export function ReservationStatusBadge({ status }: { status: InventoryReservationStatusValue }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{STATUS_LABEL[status] ?? status}</Badge>;
}
