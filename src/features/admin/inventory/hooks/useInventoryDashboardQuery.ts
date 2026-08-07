"use client";

import { useQuery } from "@tanstack/react-query";

import { getInventoryDashboard } from "@/lib/inventory-client";

export function useInventoryDashboardQuery() {
  return useQuery({ queryKey: ["admin-inventory-dashboard"], queryFn: getInventoryDashboard });
}
