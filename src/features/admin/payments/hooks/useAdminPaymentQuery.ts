"use client";

import { useQuery } from "@tanstack/react-query";

import { getPayment } from "@/lib/payment-client";

/** Reuses the customer-facing `GetPayment` endpoint — `GetPaymentQuery`'s own ownership-or-staff check already grants a `payments:view` holder access, so there's no separate admin-only payment-detail endpoint to call, same as `getOrder`/`getAdminOrder` staying genuinely distinct only where the response shape actually differs (it doesn't here). */
export function useAdminPaymentQuery(id: string) {
  return useQuery({
    queryKey: ["admin-payment", id],
    queryFn: () => getPayment(id),
  });
}
