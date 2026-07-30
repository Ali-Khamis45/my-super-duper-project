"use client";

import { useQuery } from "@tanstack/react-query";

import { type AdminOrderFilter, getOrders } from "@/lib/order-client";

export function useAdminOrdersQuery(filter: AdminOrderFilter) {
  return useQuery({
    queryKey: ["admin-orders", filter],
    queryFn: () => getOrders(filter),
    placeholderData: (previous) => previous,
  });
}
