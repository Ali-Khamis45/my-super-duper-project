"use client";

import { useQuery } from "@tanstack/react-query";

import { type AdminInventoryFilter, getInventory } from "@/lib/inventory-client";

export function useAdminInventoryQuery(filter: AdminInventoryFilter) {
  return useQuery({
    queryKey: ["admin-inventory", filter],
    queryFn: () => getInventory(filter),
    placeholderData: (previous) => previous,
  });
}
