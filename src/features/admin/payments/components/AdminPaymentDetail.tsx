"use client";

import { Receipt } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentStatusBadge } from "@/features/payments/components/PaymentStatusBadge";
import { ApiError } from "@/lib/api-errors";

import { useAdminPaymentQuery } from "../hooks/useAdminPaymentQuery";
import { usePaymentActionMutations } from "../hooks/usePaymentActionMutations";

/**
 * `/admin/payments/[id]` — staff/admin's own Payments actions, mirroring `AdminOrderDetail`'s own
 * shape. Mirrors `Payment`'s real allowed-from states exactly: `Capture` only shows for an
 * `Authorized` (not yet captured) current attempt — the real two-phase (`CaptureMode: "Manual"`)
 * flow, see `CapturePaymentCommand`'s own doc comment — and `Refund` only for `Succeeded`/
 * `PartiallyRefunded`, never a payment with nothing captured yet.
 */
export function AdminPaymentDetail({ paymentId }: { paymentId: string }) {
  const { data: payment, isLoading, isError } = useAdminPaymentQuery(paymentId);
  const mutations = usePaymentActionMutations();
  const [error, setError] = useState<string | null>(null);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

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

  if (isError || !payment) {
    return (
      <div className="text-muted-foreground bg-muted/30 flex flex-col items-center gap-4 rounded-xl border border-dashed py-24 text-center">
        <Receipt className="size-14 opacity-30" aria-hidden="true" />
        <h1 className="text-foreground font-display text-lg">Payment not found</h1>
        <Button nativeButton={false} render={<Link href="/admin/payments" />}>Back to payments</Button>
      </div>
    );
  }

  const currentAttempt = payment.attempts[payment.attempts.length - 1];
  const canCapture = currentAttempt?.status === "authorized";
  const canRefund = payment.status === "succeeded" || payment.status === "partially-refunded";
  const remaining = payment.amount - payment.refundedAmount;
  const anyPending = mutations.capturePayment.isPending || mutations.refundPayment.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl">{payment.orderNumber ?? payment.id}</h1>
          <p className="text-muted-foreground text-sm">Created {new Date(payment.createdAtUtc).toLocaleString()} · {payment.provider}</p>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span>${payment.amount.toFixed(2)}</span>
          </div>
          {payment.refundedAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Refunded</span>
              <span>${payment.refundedAmount.toFixed(2)}</span>
            </div>
          )}
          <Separator className="my-1" />
          <div className="flex items-center justify-between font-medium">
            <span>Remaining</span>
            <span className="font-display text-brand-accent-600 dark:text-brand-accent-400">${remaining.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-display mb-3 text-lg">Attempts</h2>
        <div className="flex flex-col gap-2">
          {payment.attempts.map((attempt) => (
            <Card key={attempt.id}>
              <CardContent className="flex flex-col gap-1 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="capitalize">{attempt.status}</span>
                  <span className="text-muted-foreground text-xs">{new Date(attempt.startedAtUtc).toLocaleString()}</span>
                </div>
                {attempt.methodDescription && <span className="text-muted-foreground">{attempt.methodDescription}</span>}
                {attempt.failureMessage && <span className="text-destructive">{attempt.failureMessage}</span>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {(canCapture || canRefund) && (
        <div className="flex flex-col gap-3 border-t pt-4">
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {canCapture && (
              <Button size="sm" disabled={anyPending} onClick={() => runAction(mutations.capturePayment.mutateAsync(payment.id))}>
                Capture payment
              </Button>
            )}
            {canRefund && (
              <Button size="sm" variant="outline" disabled={anyPending} onClick={() => setShowRefundForm((current) => !current)}>
                Refund
              </Button>
            )}
          </div>

          {showRefundForm && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1">
                <Label htmlFor="refund-amount">Amount (blank = full ${remaining.toFixed(2)})</Label>
                <Input id="refund-amount" type="number" min={0.01} max={remaining} step={0.01} value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} placeholder={remaining.toFixed(2)} />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Label htmlFor="refund-reason">Reason</Label>
                <Input id="refund-reason" value={refundReason} onChange={(event) => setRefundReason(event.target.value)} placeholder="e.g. Customer request" />
              </div>
              <Button
                size="sm"
                variant="destructive"
                disabled={anyPending}
                onClick={() => {
                  const amount = refundAmount.trim() ? Number(refundAmount) : null;
                  void runAction(mutations.refundPayment.mutateAsync({ id: payment.id, amount, reason: refundReason.trim() || null }));
                  setShowRefundForm(false);
                  setRefundAmount("");
                  setRefundReason("");
                }}
              >
                Confirm refund
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
