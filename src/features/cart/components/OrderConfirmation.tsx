"use client";

import { motion } from "framer-motion";
import { CheckCircle2, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { springs } from "@/engine/motion/springs";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useCartStore } from "@/stores/cart-store";

/**
 * `/checkout/confirmation` — "Confirmation feels premium" (the brief's own
 * Creative Budget example): a real, tasteful checkmark reveal, not a
 * plain "Thank you" paragraph. Reads `cart-store`'s `lastOrder` — since
 * Sprint 5.3, the real `OrderDto` the backend returned from `placeOrder()`,
 * not a locally-fabricated record — rather than anything route/query-string-
 * carried, so a reload still shows the same real order (as long as the
 * session hasn't cleared it) instead of needing to re-parse URL params.
 *
 * Sprint 5.5 — this page is now only reachable *after* `PaymentProcessing`
 * (`/checkout/payment`) sees a real `succeeded` `Payment`, not merely after
 * the order was submitted; the copy below reflects "paid," not just "placed."
 * `lastPaymentId` (also from `cart-store`, same persistence pattern as
 * `lastOrder`) links to the real receipt page when present.
 */
export function OrderConfirmation() {
  const lastOrder = useCartStore((state) => state.lastOrder);
  const lastPaymentId = useCartStore((state) => state.lastPaymentId);
  const reducedMotion = usePrefersReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  if (!lastOrder) {
    return (
      <div id="main-content" className="mx-auto max-w-xl px-4 pt-24 pb-16 text-center sm:px-6">
        <div className="text-muted-foreground bg-muted/30 flex flex-col items-center gap-4 rounded-xl border border-dashed py-24">
          <ShoppingBag className="size-14 opacity-30" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h1 className="text-foreground font-display text-lg">No recent order</h1>
            <p className="text-sm">Nothing to confirm yet.</p>
          </div>
          <Button nativeButton={false} render={<Link href="/menu" />}>Browse the menu</Button>
        </div>
      </div>
    );
  }

  const itemCount = lastOrder.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div id="main-content" className="mx-auto max-w-xl px-4 pt-24 pb-16 text-center sm:px-6">
      <motion.div
        initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        // Sprint 3.8 fix: was a hand-rolled overshoot cubic-bezier,
        // duplicating exactly what `springs.bouncy` ("Playful overshoot —
        // pop/press feedback") already exists for — the checkout's
        // signature "premium" moment now draws from the same token every
        // other overshoot-feeling interaction in the app does.
        transition={springs.bouncy}
        className="mb-4 flex justify-center"
      >
        <CheckCircle2 className="text-brand-accent-500 size-16" aria-hidden="true" />
      </motion.div>

      <h1 ref={headingRef} tabIndex={-1} className="font-display mb-1 text-2xl outline-none">
        Payment confirmed
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Thank you — order <span className="text-foreground font-medium">#{lastOrder.orderNumber}</span> is paid and on its way.
      </p>

      <Card className="mb-6 text-left">
        <CardContent className="flex flex-col gap-1.5 text-sm">
          {lastOrder.items.map((item) => (
            <div key={item.id} className="text-muted-foreground flex items-center justify-between">
              <span>
                {item.productName}
                {item.quantity > 1 ? ` ×${item.quantity}` : ""}
              </span>
              <span>${item.lineTotal.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-border mt-1 flex items-center justify-between border-t pt-1.5 font-medium">
            <span>Total ({itemCount} item{itemCount === 1 ? "" : "s"})</span>
            <span className="font-display text-brand-accent-600 dark:text-brand-accent-400">${lastOrder.total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
        {lastPaymentId && (
          <Button variant="outline" nativeButton={false} render={<Link href={`/payments/${lastPaymentId}`} />}>
            View receipt
          </Button>
        )}
        <Button nativeButton={false} render={<Link href="/orders" />}>View my orders</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/menu" />}>Back to the menu</Button>
      </div>
    </div>
  );
}
