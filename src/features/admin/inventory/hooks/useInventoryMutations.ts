"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { appEvents } from "@/engine/events";
import * as inventoryClient from "@/lib/inventory-client";

/** Same "invalidate the list, seed the single-item cache from the mutation's own response" shape as `useOrderStatusMutations.ts` — every real staff action against one `InventoryItem`. */
export function useInventoryMutations() {
  const queryClient = useQueryClient();

  function invalidateAndCache(item: inventoryClient.InventoryItemDto) {
    queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
    queryClient.invalidateQueries({ queryKey: ["admin-inventory-dashboard"] });
    // A real bug this sprint's own adversarial review caught live: TanStack Query's
    // `invalidateQueries` matches by query-key array prefix, not string prefix —
    // `["admin-inventory-history", ...]`/`["admin-inventory-item", ...]` don't start with the
    // `["admin-inventory"]` array above (different first elements), so without this explicit
    // line "Recent activity" on `/admin/inventory/[id]` silently kept showing stale data after
    // every restock/adjust/mark action until a full page reload.
    queryClient.invalidateQueries({ queryKey: ["admin-inventory-history"] });
    queryClient.setQueryData(["admin-inventory-item", item.id], item);
  }

  const restock = useMutation({
    mutationFn: ({ id, quantity, note }: { id: string; quantity: number; note: string | null }) =>
      inventoryClient.restockInventoryItem(id, quantity, note),
    onSuccess: (item) => {
      invalidateAndCache(item);
      appEvents.emit({ name: "inventory:restocked", inventoryItemId: item.id });
    },
  });

  const adjust = useMutation({
    mutationFn: ({ id, delta, reason }: { id: string; delta: number; reason: string }) =>
      inventoryClient.adjustInventoryItem(id, delta, reason),
    onSuccess: (item) => {
      invalidateAndCache(item);
      appEvents.emit({ name: "inventory:adjusted", inventoryItemId: item.id });
    },
  });

  const markOutOfStock = useMutation({
    mutationFn: inventoryClient.markInventoryItemOutOfStock,
    onSuccess: (item) => {
      invalidateAndCache(item);
      appEvents.emit({ name: "inventory:marked-out-of-stock", inventoryItemId: item.id });
    },
  });

  const markAvailable = useMutation({
    mutationFn: inventoryClient.markInventoryItemAvailable,
    onSuccess: (item) => {
      invalidateAndCache(item);
      appEvents.emit({ name: "inventory:marked-available", inventoryItemId: item.id });
    },
  });

  const updateLowStockPolicy = useMutation({
    mutationFn: ({ id, threshold }: { id: string; threshold: number }) => inventoryClient.updateLowStockPolicy(id, threshold),
    onSuccess: invalidateAndCache,
  });

  const expireReservation = useMutation({
    mutationFn: inventoryClient.expireReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-inventory-reservations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["admin-inventory-dashboard"] });
    },
  });

  return { restock, adjust, markOutOfStock, markAvailable, updateLowStockPolicy, expireReservation };
}
