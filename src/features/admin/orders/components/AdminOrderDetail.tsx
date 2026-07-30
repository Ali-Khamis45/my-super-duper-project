"use client";

import { PackageOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "@/features/orders/components/OrderStatusBadge";
import { OrderTimeline } from "@/features/orders/components/OrderTimeline";
import { ApiError } from "@/lib/api-errors";

import { useAdminOrderQuery } from "../hooks/useAdminOrderQuery";
import { useOrderStatusMutations } from "../hooks/useOrderStatusMutations";

/**
 * `/admin/orders/[id]` — staff/admin's own status transitions, mirroring
 * `Coffeshop.Domain.Ordering.Order`'s real allowed-from states exactly (`Cancel`/`MarkPaid`/
 * `MarkCompleted`/`Fail`'s own guard clauses) so a button is never shown for a transition the
 * backend would 409 a moment later. "Pay" means what it means at a real small coffee shop's own
 * point of sale — staff recording that payment was actually received (cash, an in-person card
 * reader) — not a card-number form; see `PayOrderCommand`'s own doc comment.
 */
export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const { data: order, isLoading, isError } = useAdminOrderQuery(orderId);
  const mutations = useOrderStatusMutations();
  const [error, setError] = useState<string | null>(null);
  const [failReason, setFailReason] = useState("");
  const [showFailForm, setShowFailForm] = useState(false);

  async function runAction(action: Promise<unknown>) {
    setError(null);
    try {
      await action;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That action couldn't be completed. Try again.");
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
        <h1 className="text-foreground font-display text-lg">Order not found</h1>
        <Button nativeButton={false} render={<Link href="/admin/orders" />}>Back to orders</Button>
      </div>
    );
  }

  const canPay = order.status === "submitted";
  const canComplete = order.status === "paid";
  const canFail = order.status === "submitted";
  const canCancel = order.status === "draft" || order.status === "submitted" || order.status === "paid";
  const anyPending = mutations.payOrder.isPending || mutations.completeOrder.isPending || mutations.failOrder.isPending || mutations.cancelOrder.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl">{order.orderNumber}</h1>
          <p className="text-muted-foreground text-sm">
            Placed {new Date(order.createdAtUtc).toLocaleString()}
            {order.guestName ? ` · Guest: ${order.guestName} (${order.guestEmail})` : order.customerId ? ` · Customer ID: ${order.customerId}` : ""}
          </p>
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

      {(canPay || canComplete || canFail || canCancel) && (
        <div className="flex flex-col gap-3 border-t pt-4">
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {canPay && (
              <Button size="sm" disabled={anyPending} onClick={() => runAction(mutations.payOrder.mutateAsync(order.id))}>
                Mark paid
              </Button>
            )}
            {canComplete && (
              <Button size="sm" disabled={anyPending} onClick={() => runAction(mutations.completeOrder.mutateAsync(order.id))}>
                Mark completed
              </Button>
            )}
            {canFail && (
              <Button size="sm" variant="outline" disabled={anyPending} onClick={() => setShowFailForm((current) => !current)}>
                Mark failed
              </Button>
            )}
            {canCancel && (
              <Button size="sm" variant="outline" disabled={anyPending} onClick={() => runAction(mutations.cancelOrder.mutateAsync({ id: order.id, reason: "Cancelled by staff" }))}>
                Cancel order
              </Button>
            )}
          </div>

          {showFailForm && (
            <div className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="fail-reason">Failure reason</Label>
                <Input id="fail-reason" value={failReason} onChange={(event) => setFailReason(event.target.value)} placeholder="e.g. Card declined" />
              </div>
              <Button
                size="sm"
                variant="destructive"
                disabled={!failReason.trim() || anyPending}
                onClick={() => {
                  void runAction(mutations.failOrder.mutateAsync({ id: order.id, reason: failReason.trim() }));
                  setShowFailForm(false);
                  setFailReason("");
                }}
              >
                Confirm
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
