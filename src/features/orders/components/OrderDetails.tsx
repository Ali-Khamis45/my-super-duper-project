"use client";

import { PackageOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-errors";

import { useCancelOrderMutation } from "../hooks/useCancelOrderMutation";
import { useOrderQuery } from "../hooks/useOrderQuery";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderTimeline } from "./OrderTimeline";

/** Mirrors `Coffeshop.Domain.Ordering.Order.Cancel`'s own allowed-from statuses exactly — a real backend-enforced rule (see that method's own doc comment), not re-derived; showing the button outside this set would just be a guaranteed 409 a moment later. */
const CANCELLABLE_STATUSES = new Set(["draft", "submitted", "paid"]);

/** `/orders/[id]` — Order Details, Order Timeline, and the one real customer-initiated status transition (`Cancel`) this sprint's frontend surfaces. `GetOrderQuery`'s own ownership-or-staff-permission check (never a distinguishing 403) means a non-owner sees the exact same "not found" state as a genuinely bad id — see that handler's own doc comment. */
export function OrderDetails({ orderId }: { orderId: string }) {
  const { data: order, isLoading, isError } = useOrderQuery(orderId);
  const cancelMutation = useCancelOrderMutation();
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    setCancelError(null);
    try {
      await cancelMutation.mutateAsync({ id: orderId, reason: null });
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Couldn't cancel this order. Try again.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="text-muted-foreground bg-muted/30 flex flex-col items-center gap-4 rounded-xl border border-dashed py-24 text-center">
        <PackageOpen className="size-14 opacity-30" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground font-display text-lg">Order not found</h1>
          <p className="text-sm">This order doesn&apos;t exist, or isn&apos;t yours to view.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/orders" />}>Back to my orders</Button>
      </div>
    );
  }

  const canCancel = CANCELLABLE_STATUSES.has(order.status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl">{order.orderNumber}</h1>
          <p className="text-muted-foreground text-sm">Placed {new Date(order.createdAtUtc).toLocaleString()}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {item.productName}
                {item.quantity > 1 ? ` ×${item.quantity}` : ""}
              </span>
              <span>${item.lineTotal.toFixed(2)}</span>
            </div>
          ))}
          <Separator className="my-1" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between font-medium">
            <span>Total</span>
            <span className="font-display text-brand-accent-600 dark:text-brand-accent-400">${order.total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {order.cancellationReason && <p className="text-muted-foreground text-sm">Cancelled: {order.cancellationReason}</p>}
      {order.failureReason && <p className="text-destructive text-sm">Failed: {order.failureReason}</p>}

      <div>
        <h2 className="font-display mb-3 text-lg">Order Timeline</h2>
        <OrderTimeline entries={order.timeline} />
      </div>

      {canCancel && (
        <div className="flex flex-col items-start gap-2">
          {cancelError && (
            <p role="alert" className="text-destructive text-sm">
              {cancelError}
            </p>
          )}
          <Button variant="outline" onClick={handleCancel} disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? "Cancelling…" : "Cancel order"}
          </Button>
        </div>
      )}
    </div>
  );
}
