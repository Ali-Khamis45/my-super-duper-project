"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { appEvents } from "@/engine/events";
import * as paymentClient from "@/lib/payment-client";

/** Same "invalidate the list, seed the single-payment cache from the mutation's own response" shape as `useOrderStatusMutations.ts` — staff/admin's real Payments actions (capture, refund). */
export function usePaymentActionMutations() {
  const queryClient = useQueryClient();

  function invalidateAndCache(payment: paymentClient.PaymentDto) {
    queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
    queryClient.invalidateQueries({ queryKey: ["payment-receipt", payment.id] });
    queryClient.setQueryData(["admin-payment", payment.id], payment);
  }

  const capturePayment = useMutation({
    mutationFn: paymentClient.capturePayment,
    onSuccess: (payment) => {
      invalidateAndCache(payment);
      appEvents.emit({ name: "payment:succeeded", paymentId: payment.id, orderId: payment.orderId });
    },
  });

  const refundPayment = useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount: number | null; reason: string | null }) => paymentClient.refundPayment(id, amount, reason),
    onSuccess: (payment) => {
      invalidateAndCache(payment);
      appEvents.emit({ name: "payment:refunded", paymentId: payment.id, orderId: payment.orderId, amount: payment.refundedAmount });
    },
  });

  return { capturePayment, refundPayment };
}
