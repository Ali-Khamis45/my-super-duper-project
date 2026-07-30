"use client";

import { useQuery } from "@tanstack/react-query";

import { getProduct } from "@/lib/product-client";

export function useAdminProductQuery(id: string) {
  return useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => getProduct(id),
  });
}
