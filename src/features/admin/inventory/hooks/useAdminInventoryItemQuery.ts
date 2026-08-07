"use client";

import { useQuery } from "@tanstack/react-query";

import { getInventoryItem } from "@/lib/inventory-client";

export function useAdminInventoryItemQuery(id: string) {
  return useQuery({ queryKey: ["admin-inventory-item", id], queryFn: () => getInventoryItem(id) });
}
