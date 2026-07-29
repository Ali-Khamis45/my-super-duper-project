"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SheetFooter } from "@/components/ui/sheet";
import { fadeIn } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { selectCartTotal, useCartStore } from "@/stores/cart-store";

import { CartItemRow } from "./CartItemRow";

interface MiniCartProps {
  onNavigate?: () => void;
}

/**
 * "Mini Cart" — the `CartIcon`'s `Sheet` body: a quick, compact preview
 * (`CartItemRow`'s `compact` mode — no quantity stepper/edit clutter for a
 * glance-and-go panel), the running total, and the two real next steps
 * ("View Cart" for the full editing experience, "Checkout" straight
 * through). "Empty-cart animation" — a real, distinct empty state, not a
 * blank panel.
 */
export function MiniCart({ onNavigate }: MiniCartProps) {
  const items = useCartStore((state) => state.items);
  const total = selectCartTotal(items);
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4">
        <AnimatePresence mode="wait">
          {items.length === 0 ? (
            <motion.div
              key="empty"
              initial={reducedMotion ? false : "hidden"}
              animate={reducedMotion ? undefined : "visible"}
              exit={reducedMotion ? undefined : "hidden"}
              variants={fadeIn}
              className="text-muted-foreground flex flex-col items-center gap-2 py-10 text-center text-sm"
            >
              <ShoppingBag className="size-8 opacity-40" aria-hidden="true" />
              <p>Your cart is empty.</p>
            </motion.div>
          ) : (
            <motion.div key="items" initial={reducedMotion ? false : "hidden"} animate={reducedMotion ? undefined : "visible"} variants={fadeIn} className="divide-border divide-y">
              {items.map((item) => (
                <CartItemRow key={item.snapshot.id} item={item} compact />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {items.length > 0 && (
        <SheetFooter className="border-border border-t">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Total</span>
            <span className="font-display text-brand-accent-600 dark:text-brand-accent-400">${total.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onNavigate} nativeButton={false} render={<Link href="/cart" />}>
              View Cart
            </Button>
            <Button type="button" className="flex-1" onClick={onNavigate} nativeButton={false} render={<Link href="/checkout" />}>
              Checkout
            </Button>
          </div>
        </SheetFooter>
      )}
    </div>
  );
}
