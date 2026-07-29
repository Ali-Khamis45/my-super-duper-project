"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useCartStore } from "@/stores/cart-store";

/**
 * `/checkout/confirmation` — "Confirmation feels premium" (the brief's own
 * Creative Budget example): a real, tasteful checkmark reveal, not a
 * plain "Thank you" paragraph. Reads `cart-store`'s `lastOrder` (set by
 * `placeOrder()`) rather than anything route/query-string-carried — the
 * order's own recipe snapshots are the full, durable record, "linking
 * orders... for future use" (the brief's own words) starting from a real
 * model instead of URL params that would need re-parsing.
 */
export function OrderConfirmation() {
  const lastOrder = useCartStore((state) => state.lastOrder);
  const reducedMotion = usePrefersReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  if (!lastOrder) {
    return (
      <div id="main-content" className="mx-auto max-w-xl px-4 pt-24 pb-16 text-center sm:px-6">
        <h1 className="font-display mb-2 text-2xl">No recent order</h1>
        <p className="text-muted-foreground mb-4 text-sm">Nothing to confirm yet.</p>
        <Button nativeButton={false} render={<Link href="/menu" />}>Browse the menu</Button>
      </div>
    );
  }

  const itemCount = lastOrder.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div id="main-content" className="mx-auto max-w-xl px-4 pt-24 pb-16 text-center sm:px-6">
      <motion.div
        initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="mb-4 flex justify-center"
      >
        <CheckCircle2 className="text-brand-accent-500 size-16" aria-hidden="true" />
      </motion.div>

      <h1 ref={headingRef} tabIndex={-1} className="font-display mb-1 text-2xl outline-none">
        Order confirmed
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Thank you — order <span className="text-foreground font-medium">#{lastOrder.id.slice(0, 8).toUpperCase()}</span> is on its way.
      </p>

      <Card className="mb-6 text-left">
        <CardContent className="flex flex-col gap-1.5 text-sm">
          {lastOrder.items.map((item) => (
            <div key={item.snapshot.id} className="text-muted-foreground flex items-center justify-between">
              <span>
                {item.snapshot.baseDrinkName}
                {item.quantity > 1 ? ` ×${item.quantity}` : ""}
              </span>
              <span>${(item.snapshot.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-border mt-1 flex items-center justify-between border-t pt-1.5 font-medium">
            <span>Total ({itemCount} item{itemCount === 1 ? "" : "s"})</span>
            <span className="font-display text-brand-accent-600 dark:text-brand-accent-400">${lastOrder.total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Button nativeButton={false} render={<Link href="/menu" />}>Back to the menu</Button>
    </div>
  );
}
