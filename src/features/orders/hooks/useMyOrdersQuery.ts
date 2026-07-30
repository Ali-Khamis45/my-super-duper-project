"use client";

import { useQuery } from "@tanstack/react-query";

import { getMyOrders } from "@/lib/order-client";

export function useMyOrdersQuery(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["my-orders", page, pageSize],
    queryFn: () => getMyOrders(page, pageSize),
    placeholderData: (previous) => previous,
  });
}
