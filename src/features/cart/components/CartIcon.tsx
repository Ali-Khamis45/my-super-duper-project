"use client";

import { ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { springs } from "@/engine/motion/springs";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { selectCartItemCount, useCartStore } from "@/stores/cart-store";

import { cartIconAnchor } from "../lib/cartIconAnchor";
import { MiniCart } from "./MiniCart";

/**
 * The navbar cart trigger — an icon + a real item-count badge, opening
 * `MiniCart` in a `Sheet` (the same slide-over primitive `MobileMenu`
 * already uses, real focus-trap/Escape-close for free). Registers its own
 * DOM node with `cartIconAnchor` so `AddToCartButton`'s "fly to cart"
 * animation has a real target position to animate toward, without a prop
 * or context threaded across the whole app tree.
 */
export function CartIcon() {
  const [open, setOpen] = useState(false);
  const items = useCartStore((state) => state.items);
  const count = selectCartItemCount(items);
  const reducedMotion = usePrefersReducedMotion();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cartIconAnchor.setValue(buttonRef.current);
    return () => cartIconAnchor.setValue(null);
  }, []);

  // React's own documented "adjust state during render" pattern for
  // comparing against a previous render's value — reading a ref's
  // `.current` during render (the more obvious approach) is a real
  // anti-pattern `react-hooks/refs` correctly flags, since it can produce
  // torn reads under concurrent rendering. Calling `setState` directly in
  // the render body here is sanctioned specifically for this case: React
  // re-renders immediately with the updated state before committing,
  // never paints an intermediate frame.
  const [previousCount, setPreviousCount] = useState(count);
  const [justIncreased, setJustIncreased] = useState(false);
  if (count !== previousCount) {
    setJustIncreased(count > previousCount);
    setPreviousCount(count);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            ref={buttonRef}
            variant="ghost"
            size="icon"
            aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
            className="relative"
            data-onboarding="cart-icon"
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
            {count > 0 && (
              <motion.span
                key={reducedMotion ? "static" : justIncreased ? "bump" : "steady"}
                initial={!reducedMotion && justIncreased ? { scale: 0.6 } : false}
                animate={{ scale: 1 }}
                // Sprint 3.8 fix: was a hardcoded duration+bare easing
                // string — `springs.bouncy` ("Playful overshoot — pop/press
                // feedback") is the exact preset this badge-pop moment
                // already fits, not a new tuning.
                transition={springs.bouncy}
                className="bg-brand-accent-500 absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-medium text-white"
                aria-hidden="true"
              >
                {count > 9 ? "9+" : count}
              </motion.span>
            )}
          </Button>
        }
      />
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Your cart</SheetTitle>
        </SheetHeader>
        <MiniCart onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
