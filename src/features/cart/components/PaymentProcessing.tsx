"use client";

import { AlertCircle, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appEvents } from "@/engine/events";
import { ApiError } from "@/lib/api-errors";
import { cancelPayment, confirmPayment, createCheckoutSession, type PaymentDto } from "@/lib/payment-client";
import { useCartStore } from "@/stores/cart-store";

type Status = "confirming" | "declined" | "awaiting-capture" | "cancelling" | "cancelled" | "error";

/**
 * `/checkout/payment` — the real charge step Sprint 5.5 adds between "Place Order" and
 * "Order confirmed." Reads `lastOrder`/`lastPaymentId` from `cart-store` (not URL params, same
 * reasoning `OrderConfirmation` already documents), so a refresh, a back-button return, or a
 * second tab all resolve against the *same* real `Payment` rather than losing context — every
 * call here (`confirmPayment`, `createCheckoutSession` for a retry) is genuinely idempotent
 * server-side, so re-running this component's effect on remount is always safe, never a double
 * charge. See `features/cart/README.md` for the full state diagram.
 */
export function PaymentProcessing() {
  const router = useRouter();
  const lastOrder = useCartStore((state) => state.lastOrder);
  const lastPaymentId = useCartStore((state) => state.lastPaymentId);
  const setLastPaymentId = useCartStore((state) => state.setLastPaymentId);
  const [status, setStatus] = useState<Status>("confirming");
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const attemptedPaymentId = useRef<string | null>(null);

  function applyOutcome(payment: PaymentDto) {
    if (payment.status === "succeeded") {
      appEvents.emit({ name: "payment:succeeded", paymentId: payment.id, orderId: payment.orderId });
      router.replace("/checkout/confirmation");
      return;
    }
    if (payment.status === "processing") {
      // Two-phase (PaymentsOptions.CaptureMode: "Manual") — authorized, awaiting staff capture.
      // Not this environment's default, but a real, reachable outcome, not a dead branch.
      setStatus("awaiting-capture");
      return;
    }
    if (payment.status === "cancelled") {
      setStatus("cancelled");
      return;
    }
    // "pending" — the attempt was declined or errored; the Payment itself stays retryable.
    const lastAttempt = payment.attempts[payment.attempts.length - 1];
    const reason = lastAttempt?.failureMessage ?? "Your payment could not be completed.";
    setFailureMessage(reason);
    appEvents.emit({ name: "payment:declined", paymentId: payment.id, orderId: payment.orderId, reason });
    setStatus("declined");
  }

  async function runConfirm(paymentId: string) {
    setStatus("confirming");
    setFailureMessage(null);
    try {
      const payment = await confirmPayment(paymentId);
      applyOutcome(payment);
    } catch (err) {
      setStatus("error");
      setFailureMessage(err instanceof ApiError ? err.message : "Something went wrong confirming your payment.");
    }
  }

  useEffect(() => {
    if (!lastPaymentId) return;
    if (attemptedPaymentId.current === lastPaymentId) return; // StrictMode double-invocation guard.
    attemptedPaymentId.current = lastPaymentId;
    void runConfirm(lastPaymentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPaymentId]);

  async function handleRetry() {
    if (!lastOrder) return;
    setIsRetrying(true);
    try {
      const session = await createCheckoutSession(lastOrder.id);
      setLastPaymentId(session.paymentId);
      appEvents.emit({ name: "payment:retried", paymentId: session.paymentId, orderId: lastOrder.id });
      attemptedPaymentId.current = session.paymentId;
      await runConfirm(session.paymentId);
    } catch (err) {
      setStatus("error");
      setFailureMessage(err instanceof ApiError ? err.message : "Something went wrong starting a new payment attempt.");
    } finally {
      setIsRetrying(false);
    }
  }

  async function handleCancel() {
    if (!lastPaymentId || !lastOrder) return;
    setStatus("cancelling");
    try {
      const payment = await cancelPayment(lastPaymentId, "Customer cancelled checkout.");
      appEvents.emit({ name: "payment:cancelled", paymentId: payment.id, orderId: payment.orderId });
      setLastPaymentId(null);
      setStatus("cancelled");
    } catch (err) {
      setStatus("error");
      setFailureMessage(err instanceof ApiError ? err.message : "Something went wrong cancelling this payment.");
    }
  }

  if (!lastOrder || !lastPaymentId) {
    return (
      <div id="main-content" className="mx-auto max-w-xl px-4 pt-24 pb-16 text-center sm:px-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <AlertCircle className="text-destructive size-8" aria-hidden />
            <h1 className="font-display text-xl">Nothing to pay for</h1>
            <p className="text-muted-foreground text-sm">Start a new order from the menu.</p>
            <Button render={<Link href="/menu" />} nativeButton={false} className="mt-2">
              Browse the menu
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div id="main-content" className="mx-auto max-w-xl px-4 pt-24 pb-16 sm:px-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          {status === "confirming" && (
            <>
              <Loader2 className="text-primary size-8 animate-spin" aria-hidden />
              <h1 className="font-display text-xl">Confirming your payment…</h1>
              <p className="text-muted-foreground text-sm">
                Order #{lastOrder.orderNumber} — ${lastOrder.total.toFixed(2)}
              </p>
            </>
          )}

          {status === "awaiting-capture" && (
            <>
              <Loader2 className="text-primary size-8 animate-spin" aria-hidden />
              <h1 className="font-display text-xl">Payment authorized</h1>
              <p className="text-muted-foreground text-sm">Your card was approved — we&apos;ll finish processing your order shortly.</p>
            </>
          )}

          {status === "declined" && (
            <>
              <XCircle className="text-destructive size-8" aria-hidden />
              <h1 className="font-display text-xl">Payment declined</h1>
              <p role="alert" className="text-muted-foreground text-sm">
                {failureMessage}
              </p>
              <div className="mt-2 flex gap-2">
                <Button onClick={handleRetry} disabled={isRetrying}>
                  {isRetrying ? "Retrying…" : "Try again"}
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel order
                </Button>
              </div>
            </>
          )}

          {status === "cancelling" && (
            <>
              <Loader2 className="text-primary size-8 animate-spin" aria-hidden />
              <p className="text-muted-foreground text-sm">Cancelling…</p>
            </>
          )}

          {status === "cancelled" && (
            <>
              <AlertCircle className="text-muted-foreground size-8" aria-hidden />
              <h1 className="font-display text-xl">Checkout cancelled</h1>
              <p className="text-muted-foreground text-sm">Order #{lastOrder.orderNumber} was not paid for.</p>
              <Button render={<Link href="/menu" />} nativeButton={false} className="mt-2">
                Back to the menu
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <AlertCircle className="text-destructive size-8" aria-hidden />
              <h1 className="font-display text-xl">Something went wrong</h1>
              <p role="alert" className="text-muted-foreground text-sm">
                {failureMessage}
              </p>
              <Button onClick={() => void runConfirm(lastPaymentId)} className="mt-2">
                Try again
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
