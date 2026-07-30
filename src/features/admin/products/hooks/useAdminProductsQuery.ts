"use client";

import { useQuery } from "@tanstack/react-query";

import { type AdminProductFilter, getProducts } from "@/lib/product-client";

export function useAdminProductsQuery(filter: AdminProductFilter) {
  return useQuery({
    queryKey: ["admin-products", filter],
    queryFn: () => getProducts(filter),
    placeholderData: (previous) => previous,
  });
}
