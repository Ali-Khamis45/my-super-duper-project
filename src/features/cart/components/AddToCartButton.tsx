"use client";

import { motion } from "framer-motion";
import { Check, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { durations } from "@/engine/motion/durations";
import { easings } from "@/engine/motion/easings";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useCartStore } from "@/stores/cart-store";
import { useCustomizerStore } from "@/stores/customizer-store";

import { buildRecipeSnapshot } from "../lib/buildRecipeSnapshot";
import { cartIconAnchor } from "../lib/cartIconAnchor";

interface FlightPath {
  startX: number;
  startY: number;
  deltaX: number;
  deltaY: number;
}

const CONFIRMATION_DURATION_MS = 1200;

/**
 * "Cup flies smoothly into cart" — the brief's own Creative Budget
 * example, built for real: a small ghost element animates from this
 * button's on-screen position to the navbar's cart icon (via
 * `cartIconAnchor`, the bridge store `CartIcon` registers itself with),
 * then the badge count pop (`CartIcon`'s own animation) picks up the
 * moment it lands. Skipped under reduced motion — a text confirmation
 * ("Added") plays either way, so the *feedback* is never motion-dependent,
 * only the *flourish* is.
 */
export function AddToCartButton() {
  const selection = useCustomizerStore((state) => state.selection);
  const baseDrinkId = useCustomizerStore((state) => state.baseDrinkId);
  const baseDrinkCategory = useCustomizerStore((state) => state.baseDrinkCategory);
  const appliedRecommendationId = useCustomizerStore((state) => state.appliedRecommendationId);
  const addItem = useCartStore((state) => state.addItem);
  const reducedMotion = usePrefersReducedMotion();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [flight, setFlight] = useState<FlightPath | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const timeout = setTimeout(() => setJustAdded(false), CONFIRMATION_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [justAdded]);

  function handleAddToCart() {
    const snapshot = buildRecipeSnapshot({ baseDrinkId, baseDrinkCategory, selection, appliedRecommendationId });
    if (!snapshot) return;
    addItem(snapshot);
    setJustAdded(true);

    // The customizer panel's own scroll can carry the whole window down far
    // enough to hide the fixed navbar (and its cart icon) — this button
    // sits at the very bottom of a long panel. Snapping back to the top
    // (instant, not animated — this is a position correction, not a
    // decorative motion) before measuring rects means the fly-to-cart
    // animation always has a real, visible destination, the same
    // "cup flies smoothly into cart" moment regardless of scroll position.
    window.scrollTo(0, 0);

    const cartIcon = cartIconAnchor.getValue();
    if (!reducedMotion && buttonRef.current && cartIcon) {
      const start = buttonRef.current.getBoundingClientRect();
      const end = cartIcon.getBoundingClientRect();
      setFlight({
        startX: start.x + start.width / 2 - 10,
        startY: start.y + start.height / 2 - 10,
        deltaX: end.x + end.width / 2 - (start.x + start.width / 2),
        deltaY: end.y + end.height / 2 - (start.y + start.height / 2),
      });
    }
  }

  return (
    <>
      <Button ref={buttonRef} type="button" onClick={handleAddToCart} className="w-full gap-2">
        {justAdded ? <Check className="size-4" aria-hidden="true" /> : <ShoppingBag className="size-4" aria-hidden="true" />}
        {justAdded ? "Added" : "Add to Cart"}
      </Button>

      {flight &&
        createPortal(
          <motion.div
            aria-hidden="true"
            className="bg-brand-accent-500 pointer-events-none fixed z-100 flex size-5 items-center justify-center rounded-full text-white"
            style={{ left: flight.startX, top: flight.startY }}
            initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: 0.4, x: flight.deltaX, y: flight.deltaY }}
            // Sprint 3.8 fix: was a hardcoded duration+cubic-bezier
            // duplicating what `durations.slow`/`easings.premium` already
            // define — the project's one eased-motion token, not a second,
            // independently-tuned curve for this one flight.
            transition={{ duration: durations.slow, ease: easings.premium }}
            onAnimationComplete={() => setFlight(null)}
          >
            <ShoppingBag className="size-3" />
          </motion.div>,
          document.body,
        )}
    </>
  );
}
