"use client";

import { useQuery } from "@tanstack/react-query";

import { getInventoryHistory, type InventoryHistoryFilter } from "@/lib/inventory-client";

/** Backs both the item-detail page's own "recent activity" section (`inventoryItemId` set) and a standalone audit-viewer view (no filter) — the append-only `InventoryTransaction` ledger, per this sprint's own "InventoryAudit" domain consolidation. */
export function useInventoryHistoryQuery(filter: InventoryHistoryFilter) {
  return useQuery({
    queryKey: ["admin-inventory-history", filter],
    queryFn: () => getInventoryHistory(filter),
    placeholderData: (previous) => previous,
  });
}
