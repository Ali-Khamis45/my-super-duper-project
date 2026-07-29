"use client";

import { useEffect, useState } from "react";

import { appEvents } from "@/engine/events";

/**
 * "Announcements" + "Screen-reader summaries" — the same `aria-live="polite"`/
 * `role="status"` sr-only region convention every prior feature's own
 * announcer (`IngredientAnnouncer`, `RecommendationAnnouncer`) established.
 * Kept deliberately generic rather than naming the specific drink: `cart:
 * item-added`/`-removed` only carry a `recipeId` (the snapshot's own id,
 * not a menu drink id), and by the time `-removed` fires the item is
 * already gone from the store — there's nothing left to resolve a name
 * from. A real, meaningful announcement doesn't require one.
 *
 * `aria-label="Cart announcements"` — this region lives in the global
 * navbar, so it coexists with a route-specific announcer
 * (`IngredientAnnouncer` on `/customize`, `RecommendationAnnouncer` on
 * `/concierge`) on some pages; a distinct name is real, correct
 * accessibility practice for multiple simultaneous live regions, not just
 * a way to keep e2e locators unambiguous (though it does that too).
 */
export function CartAnnouncer() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubAdded = appEvents.on("cart:item-added", () => {
      setMessage("Item added to cart");
    });
    const unsubRemoved = appEvents.on("cart:item-removed", () => {
      setMessage("Item removed from cart");
    });
    return () => {
      unsubAdded();
      unsubRemoved();
    };
  }, []);

  return (
    <div role="status" aria-live="polite" aria-label="Cart announcements" className="sr-only">
      {message}
    </div>
  );
}
