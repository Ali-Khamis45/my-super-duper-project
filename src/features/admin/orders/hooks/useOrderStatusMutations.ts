"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { appEvents } from "@/engine/events";
import * as orderClient from "@/lib/order-client";

/** Same "invalidate the list, seed the single-order cache from the mutation's own response" shape as `useProductMutations.ts` — staff/admin's real status transitions (pay/complete/fail/cancel), plus `admin-order`/`order` so a customer viewing the same order sees the change on next refetch. */
export function useOrderStatusMutations() {
  const queryClient = useQueryClient();

  function invalidateAndCache(order: orderClient.OrderDto) {
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    queryClient.setQueryData(["admin-order", order.id], order);
    queryClient.setQueryData(["order", order.id], order);
  }

  const payOrder = useMutation({
    mutationFn: orderClient.payOrder,
    onSuccess: (order) => {
      invalidateAndCache(order);
      appEvents.emit({ name: "order:paid", orderId: order.id });
    },
  });

  const completeOrder = useMutation({
    mutationFn: orderClient.completeOrder,
    onSuccess: (order) => {
      invalidateAndCache(order);
      appEvents.emit({ name: "order:completed", orderId: order.id });
    },
  });

  const failOrder = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => orderClient.failOrder(id, reason),
    onSuccess: (order) => {
      invalidateAndCache(order);
      appEvents.emit({ name: "order:failed", orderId: order.id });
    },
  });

  const cancelOrder = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string | null }) => orderClient.cancelOrder(id, reason),
    onSuccess: (order) => {
      invalidateAndCache(order);
      appEvents.emit({ name: "order:cancelled", orderId: order.id });
    },
  });

  return { payOrder, completeOrder, failOrder, cancelOrder };
}
