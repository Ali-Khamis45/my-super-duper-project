"use client";

import { useQuery } from "@tanstack/react-query";

import { getMyPayments } from "@/lib/payment-client";

export function useMyPaymentsQuery(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["my-payments", page, pageSize],
    queryFn: () => getMyPayments(page, pageSize),
    placeholderData: (previous) => previous,
  });
}
