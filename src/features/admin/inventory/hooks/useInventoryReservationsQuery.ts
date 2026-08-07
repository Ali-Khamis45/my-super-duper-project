"use client";

import { useQuery } from "@tanstack/react-query";

import { getInventoryReservations, type InventoryReservationsFilter } from "@/lib/inventory-client";

export function useInventoryReservationsQuery(filter: InventoryReservationsFilter) {
  return useQuery({
    queryKey: ["admin-inventory-reservations", filter],
    queryFn: () => getInventoryReservations(filter),
    placeholderData: (previous) => previous,
  });
}
