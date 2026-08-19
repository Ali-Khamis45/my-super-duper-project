"use client";

import { useQuery } from "@tanstack/react-query";

import { getPaymentReceipt } from "@/lib/payment-client";

export function usePaymentReceiptQuery(paymentId: string) {
  return useQuery({
    queryKey: ["payment-receipt", paymentId],
    queryFn: () => getPaymentReceipt(paymentId),
  });
}
