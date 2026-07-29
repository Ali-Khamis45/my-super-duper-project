"use client";

import { resolveDrink } from "@/features/menu/data/drinks";
import { useConciergeStore } from "@/stores/concierge-store";

/**
 * "Announcements for recommendations" — the same `aria-live="polite"`/
 * `role="status"` sr-only region `features/composer/`'s `IngredientAnnouncer`
 * established in Sprint 3.3. Purely derived from `lastRecommendation`
 * during render (no `useState`/`useEffect`) — the message *is* a function
 * of that store value, so deriving it directly is both simpler and what
 * `react-hooks/set-state-in-effect` actually wants here: an aria-live
 * region only needs its text content to change for a screen reader to
 * announce it, which a derived value updates exactly the same way a
 * `setState` call would, without the extra render-then-effect round trip.
 */
export function RecommendationAnnouncer() {
  const lastRecommendation = useConciergeStore((state) => state.lastRecommendation);
  const drink = lastRecommendation ? resolveDrink(lastRecommendation.top.drinkId) : undefined;
  const message = drink && lastRecommendation ? `Recommendation ready: ${drink.name}, ${Math.round(lastRecommendation.top.confidence * 100)}% confidence` : "";

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {message}
    </div>
  );
}
