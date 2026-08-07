import { Badge } from "@/components/ui/badge";
import type { InventoryStatusValue } from "@/lib/inventory-client";

/** Mirrors `Coffeshop.Domain.Inventory.InventoryStatus` exactly — kebab-case on the wire, see `InventoryMappingExtensions.ToApiString(InventoryStatus)`'s own doc comment. */
const STATUS_LABEL: Record<InventoryStatusValue, string> = {
  available: "Available",
  "low-stock": "Low stock",
  "out-of-stock": "Out of stock",
};

const STATUS_VARIANT: Record<InventoryStatusValue, "default" | "secondary" | "outline" | "destructive"> = {
  available: "default",
  "low-stock": "secondary",
  "out-of-stock": "destructive",
};

export function InventoryStatusBadge({ status }: { status: InventoryStatusValue }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{STATUS_LABEL[status] ?? status}</Badge>;
}
