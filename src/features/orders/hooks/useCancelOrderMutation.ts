"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { appEvents } from "@/engine/events";
import { cancelOrder } from "@/lib/order-client";

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string | null }) => cancelOrder(id, reason),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.setQueryData(["order", order.id], order);
      appEvents.emit({ name: "order:cancelled", orderId: order.id });
    },
  });
}
