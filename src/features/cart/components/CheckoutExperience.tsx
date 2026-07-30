"use client";

import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { appEvents } from "@/engine/events";
import { fadeUp } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ApiError } from "@/lib/api-errors";
import { selectCartTotal, useCartStore } from "@/stores/cart-store";

import { PriceBreakdown } from "./PriceBreakdown";

/**
 * `/checkout` — an order summary plus a minimal, honestly-scoped form
 * (name/email for a receipt, no real payment fields; this project has no
 * payment gateway, and building fake card-number inputs would be actively
 * misleading rather than a real "premium" flow — see `PayOrderCommand`'s own
 * doc comment on what "pay" means here). "Place Order" is the checkout's
 * one real commit point: `cart-store`'s `placeOrder()` submits the cart to
 * the real `POST /api/v1/orders`, clears it, and this component navigates
 * to the confirmation route once the backend has actually accepted it.
 */
export function CheckoutExperience() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const placeOrder = useCartStore((state) => state.placeOrder);
  const reducedMotion = usePrefersReducedMotion();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stable for the lifetime of this page instance, not regenerated per click — a real double
  // submission (the same "Place Order" intent firing twice) must reuse the same key so the
  // backend's own idempotency check can recognize it; a fresh mount (e.g. navigating back to
  // /checkout again) is a legitimately new attempt and gets a new one. See `Order.IdempotencyKey`'s
  // own doc comment for the real, live-verified double-submission bug this closes.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const total = selectCartTotal(items);

  useEffect(() => {
    if (items.length === 0) return;
    appEvents.emit({ name: "checkout:started", cartTotal: total });
    // Fires once, on entering checkout with a real cart — not on every
    // total change while filling out the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPlaceOrder = items.length > 0 && name.trim().length > 0 && email.trim().length > 0;

  async function handlePlaceOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!canPlaceOrder) return;
    setIsPlacing(true);
    setError(null);
    try {
      const order = await placeOrder(name.trim(), email.trim(), idempotencyKey);
      if (!order) {
        setIsPlacing(false);
        return;
      }
      router.push("/checkout/confirmation");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong placing your order. Please try again.");
      setIsPlacing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div id="main-content" className="mx-auto max-w-xl px-4 pt-24 pb-16 text-center sm:px-6">
        <div className="text-muted-foreground bg-muted/30 flex flex-col items-center gap-4 rounded-xl border border-dashed py-24">
          <ShoppingBag className="size-14 opacity-30" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <h1 className="text-foreground font-display text-lg">Nothing to check out</h1>
            <p className="text-sm">Your cart is empty — browse the menu to get started.</p>
          </div>
          <Button nativeButton={false} render={<Link href="/menu" />}>Browse the menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div id="main-content" className="mx-auto max-w-xl px-4 pt-24 pb-16 sm:px-6">
      <motion.div initial={reducedMotion ? false : "hidden"} animate={reducedMotion ? undefined : "visible"} variants={fadeUp}>
        <h1 className="font-display mb-6 text-2xl">Checkout</h1>

        <Card className="mb-6">
          <CardContent>
            <PriceBreakdown items={items} />
          </CardContent>
        </Card>

        <form onSubmit={handlePlaceOrder} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="checkout-name" className="text-foreground text-sm font-medium">
              Name
            </label>
            <Input id="checkout-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" autoComplete="name" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="checkout-email" className="text-foreground text-sm font-medium">
              Email
            </label>
            <Input id="checkout-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
          </div>

          <Separator />

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={!canPlaceOrder || isPlacing} className="self-start">
            {isPlacing ? "Placing order…" : `Place Order — $${total.toFixed(2)}`}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
