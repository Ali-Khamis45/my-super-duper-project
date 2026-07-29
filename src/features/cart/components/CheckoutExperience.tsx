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
import { selectCartTotal, useCartStore } from "@/stores/cart-store";

import { PriceBreakdown } from "./PriceBreakdown";

/**
 * `/checkout` — an order summary plus a minimal, honestly-scoped form
 * (name/email for a receipt, no real payment fields; this project has no
 * backend or payment gateway, and building fake card-number inputs would
 * be actively misleading rather than a real "premium" flow). "Place
 * Order" is the checkout's one real commit point: `cart-store`'s
 * `placeOrder()` builds the `CompletedOrder`, clears the cart, and this
 * component navigates to the confirmation route.
 */
export function CheckoutExperience() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const placeOrder = useCartStore((state) => state.placeOrder);
  const reducedMotion = usePrefersReducedMotion();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);
  const total = selectCartTotal(items);

  useEffect(() => {
    if (items.length === 0) return;
    appEvents.emit({ name: "checkout:started", cartTotal: total });
    // Fires once, on entering checkout with a real cart — not on every
    // total change while filling out the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPlaceOrder = items.length > 0 && name.trim().length > 0 && email.trim().length > 0;

  function handlePlaceOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!canPlaceOrder) return;
    setIsPlacing(true);
    const order = placeOrder();
    if (!order) {
      setIsPlacing(false);
      return;
    }
    router.push("/checkout/confirmation");
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

          <Button type="submit" size="lg" disabled={!canPlaceOrder || isPlacing} className="self-start">
            {isPlacing ? "Placing order…" : `Place Order — $${total.toFixed(2)}`}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
