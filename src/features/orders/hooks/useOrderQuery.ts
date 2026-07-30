"use client";

import { useQuery } from "@tanstack/react-query";

import { getOrder } from "@/lib/order-client";

export function useOrderQuery(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id),
  });
}
