"use client";

import { useQuery } from "@tanstack/react-query";

import { type AdminPaymentFilter, getAdminPayments } from "@/lib/payment-client";

export function useAdminPaymentsQuery(filter: AdminPaymentFilter) {
  return useQuery({
    queryKey: ["admin-payments", filter],
    queryFn: () => getAdminPayments(filter),
    placeholderData: (previous) => previous,
  });
}
