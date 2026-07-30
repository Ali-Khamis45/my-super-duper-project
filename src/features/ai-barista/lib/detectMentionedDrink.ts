import { drinks } from "@/features/menu/data/drinks";
import type { DrinkCategoryId } from "@/features/menu/types";

/**
 * Sprint 3.9, Task 4 — a cheap, honest nudge, not a trust boundary: the
 * model is free to name a drink in its own prose (the brief wants it to —
 * "explain WHY it picked them"), but `generateRecommendation` is what
 * actually decides the recommendation, from the structured `profile` block
 * alone. Those two can disagree (the model names one drink, the
 * deterministic engine — reasoning only from taste-profile fields — picks
 * a different real one). Detecting a real drink name in the model's own
 * text and passing its category as `generateRecommendation`'s
 * `currentCategory` hint (the same "similar to what's already selected"
 * signal `features/concierge/` already scores) makes the two agree far
 * more often, without ever trusting the mention as the recommendation
 * itself — an unmatched or hallucinated name just falls back to no hint.
 */
export function detectMentionedDrinkCategory(text: string): DrinkCategoryId | undefined {
  const lowerText = text.toLowerCase();
  let bestMatch: { category: DrinkCategoryId; length: number } | undefined;

  for (const drink of drinks) {
    if (!lowerText.includes(drink.name.toLowerCase())) continue;
    if (!bestMatch || drink.name.length > bestMatch.length) {
      bestMatch = { category: drink.category, length: drink.name.length };
    }
  }

  return bestMatch?.category;
}
