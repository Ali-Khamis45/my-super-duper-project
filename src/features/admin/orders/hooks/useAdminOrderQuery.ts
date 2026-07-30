"use client";

import { useQuery } from "@tanstack/react-query";

import { getAdminOrder } from "@/lib/order-client";

export function useAdminOrderQuery(id: string) {
  return useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => getAdminOrder(id),
  });
}
