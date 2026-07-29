import { isIngredientCompatible, resolveIngredient, INGREDIENTS } from "@/features/composer/data/ingredients";
import type { Drink, DrinkCategoryId } from "@/features/menu/types";

import type { Recommendation, RecommendationReason, ScoredDrink, SuggestedCustomization, TasteProfile } from "../types";

/**
 * The "AI" here is a deterministic, fully explainable scoring pass over the
 * real menu catalog — not an LLM call. This project has no backend
 * (`features/menu/types.ts`'s own doc comment), and ADR-0005 is explicit
 * that TanStack Query stays unwired until a feature has "a real endpoint —
 * no placeholder queries." There is no real endpoint here, so this module
 * is a plain, synchronous, pure function — see `stores/concierge-store.ts`
 * for how the UI still gets a real non-blocking/cancellable request feel
 * (`useTransition`, not a simulated fetch) without pretending this is
 * remote data. The brief's own framing ("explainable... an assistant, not
 * an oracle") is a better fit for a transparent rule engine than a model
 * whose reasoning can't actually be inspected — the same "perceptually
 * believable, cheaper is correct" spirit Sprint 3.4's physics work applied
 * to a different kind of simulation.
 */

// ---------------------------------------------------------------------------
// Per-drink derived signals — read once from real `tags`/`category`, not a
// second hand-authored dataset (see docs/reviews/sprint-3.5-review.md for
// why these particular tag mappings, not a duplicated per-drink profile).
// ---------------------------------------------------------------------------

/** 1 (barely sweet) – 5 (very sweet), derived from real tags. */
function deriveDrinkSweetness(drink: Drink): number {
  if (drink.tags.includes("sweet") || drink.tags.includes("honey")) return 5;
  if (drink.tags.includes("chocolate") || drink.tags.includes("vanilla") || drink.tags.includes("spiced")) return 4;
  if (drink.tags.includes("low acid") || drink.tags.includes("floral")) return 3;
  if (drink.tags.includes("strong") || drink.tags.includes("light")) return 2;
  return 3;
}

/** 1 (mild) – 5 (bold/intense), derived from real tags. */
function deriveDrinkBitterness(drink: Drink): number {
  if (drink.tags.includes("strong")) return 5;
  if (drink.tags.includes("rich")) return 4;
  if (drink.tags.includes("smooth") || drink.tags.includes("low acid") || drink.tags.includes("floral") || drink.tags.includes("honey")) return 2;
  if (drink.tags.includes("no coffee") || drink.tags.includes("light")) return 1;
  return 3;
}

/** No structured "milk amount" field exists — real, honest heuristic from tags + the drink's own name (lattes/cappuccinos/mochas/macchiatos are inherently milk-forward; the tag catalog only ever marks the *absence* of milk explicitly). */
function deriveMilkForwardness(drink: Drink): "none" | "light" | "creamy" {
  if (drink.tags.includes("no milk") || drink.tags.includes("no dairy needed")) return "none";
  if (drink.tags.includes("creamy")) return "creamy";
  const name = drink.name.toLowerCase();
  if (name.includes("latte") || name.includes("cappuccino") || name.includes("mocha") || name.includes("macchiato")) return "creamy";
  return "light";
}

// ---------------------------------------------------------------------------
// Scoring weights — named, not magic numbers, so `MAX_POSSIBLE_SCORE`
// (confidence's denominator) is a real, checkable sum of these, not a
// guessed ceiling. See `recommendationEngine.test.ts` for the assertion
// that no drink's raw score can exceed it.
// ---------------------------------------------------------------------------

const TEMPERATURE_MATCH_WEIGHT = 3;
const TEMPERATURE_MISMATCH_WEIGHT = 2;
const CAFFEINE_MATCH_WEIGHT = 4;
const SWEETNESS_MATCH_WEIGHT = 3;
const BITTERNESS_MATCH_WEIGHT = 3;
const MILK_MATCH_WEIGHT = 3;
const TASTE_PREFERENCE_WEIGHT = 2;
const SEASON_MATCH_WEIGHT = 3;
const TIME_OF_DAY_WEIGHT = 2;
const EXISTING_SELECTION_WEIGHT = 1;

/** The best possible sum every rule below could contribute — the ceiling `confidence` normalizes against. */
export const MAX_POSSIBLE_SCORE =
  TEMPERATURE_MATCH_WEIGHT + CAFFEINE_MATCH_WEIGHT + SWEETNESS_MATCH_WEIGHT + BITTERNESS_MATCH_WEIGHT + MILK_MATCH_WEIGHT + TASTE_PREFERENCE_WEIGHT + SEASON_MATCH_WEIGHT + TIME_OF_DAY_WEIGHT + EXISTING_SELECTION_WEIGHT;

function scoreTemperature(drink: Drink, profile: TasteProfile): RecommendationReason[] {
  const isIced = drink.category === "cold-brew" || drink.tags.includes("iced");
  if (profile.temperature === "either") return [];
  if (profile.temperature === "iced") {
    return isIced
      ? [{ label: "Served cold, matching your iced preference", weight: TEMPERATURE_MATCH_WEIGHT }]
      : [{ label: "Usually served hot, not iced", weight: -TEMPERATURE_MISMATCH_WEIGHT }];
  }
  return isIced
    ? [{ label: "Served cold, not hot", weight: -TEMPERATURE_MISMATCH_WEIGHT }]
    : [{ label: "Served hot, matching your preference", weight: TEMPERATURE_MATCH_WEIGHT }];
}

function scoreCaffeine(drink: Drink, profile: TasteProfile): RecommendationReason[] {
  const isCaffeineFree = drink.tags.includes("caffeine-free option");
  const isLowCaffeine = drink.tags.includes("no coffee") && !isCaffeineFree; // matcha/chai — real caffeine, just not from coffee
  const isStrong = drink.tags.includes("strong");

  switch (profile.caffeineLevel) {
    case "none":
      if (isCaffeineFree) return [{ label: "Caffeine-free, matching your choice", weight: CAFFEINE_MATCH_WEIGHT }];
      return [{ label: "Contains real caffeine", weight: -CAFFEINE_MATCH_WEIGHT }];
    case "low":
      if (isLowCaffeine) return [{ label: "Naturally lighter on caffeine than a coffee drink", weight: CAFFEINE_MATCH_WEIGHT }];
      if (isStrong) return [{ label: "A strong caffeine hit, more than 'low'", weight: -TEMPERATURE_MISMATCH_WEIGHT }];
      return [];
    case "regular":
      if (drink.category === "espresso" || drink.category === "cold-brew") return [{ label: "Regular coffee-strength caffeine", weight: TEMPERATURE_MATCH_WEIGHT }];
      if (isCaffeineFree) return [{ label: "Little to no caffeine", weight: -TEMPERATURE_MISMATCH_WEIGHT }];
      return [];
    case "high":
      if (isStrong) return [{ label: "A bold, high-caffeine pull", weight: CAFFEINE_MATCH_WEIGHT }];
      if (isCaffeineFree) return [{ label: "Very little caffeine for a 'high' preference", weight: -CAFFEINE_MATCH_WEIGHT }];
      return [];
    default:
      return [];
  }
}

function scoreScale(profileValue: number, drinkValue: number, weight: number, matchLabel: string, mismatchLabel: string): RecommendationReason[] {
  const delta = Math.abs(profileValue - drinkValue);
  if (delta <= 1) return [{ label: matchLabel, weight }];
  if (delta >= 3) return [{ label: mismatchLabel, weight: -Math.round(weight * 0.6) }];
  return [];
}

function scoreMilk(drink: Drink, profile: TasteProfile): RecommendationReason[] {
  const forwardness = deriveMilkForwardness(drink);
  if (forwardness === profile.milkPreference) {
    const label =
      profile.milkPreference === "none"
        ? "No dairy, matching your preference"
        : profile.milkPreference === "creamy"
          ? "Rich and creamy, matching your preference"
          : "A light milk touch, matching your preference";
    return [{ label, weight: MILK_MATCH_WEIGHT }];
  }
  if (profile.milkPreference === "none" && forwardness === "creamy") {
    return [{ label: "Typically served with milk", weight: -MILK_MATCH_WEIGHT }];
  }
  if (profile.milkPreference === "creamy" && forwardness === "none") {
    return [{ label: "No milk in this one", weight: -TEMPERATURE_MISMATCH_WEIGHT }];
  }
  return [];
}

function scoreTastePreference(drink: Drink, profile: TasteProfile): RecommendationReason[] {
  const sweetness = deriveDrinkSweetness(drink);
  const bitterness = deriveDrinkBitterness(drink);
  if (profile.tastePreference === "sweet") {
    if (sweetness >= 4) return [{ label: "A genuinely sweet pick", weight: TASTE_PREFERENCE_WEIGHT }];
    if (sweetness <= 2) return [{ label: "Not much sweetness here", weight: -TASTE_PREFERENCE_WEIGHT }];
  } else if (profile.tastePreference === "bitter") {
    if (bitterness >= 4) return [{ label: "Bold and bitter, as you like it", weight: TASTE_PREFERENCE_WEIGHT }];
    if (bitterness <= 2) return [{ label: "Fairly mild, not much bitterness", weight: -TASTE_PREFERENCE_WEIGHT }];
  } else if (sweetness <= 4 && bitterness <= 4 && sweetness >= 2 && bitterness >= 2) {
    return [{ label: "A well-balanced cup", weight: TASTE_PREFERENCE_WEIGHT }];
  }
  return [];
}

function scoreSeason(drink: Drink, profile: TasteProfile): RecommendationReason[] {
  if (drink.tags.includes(profile.season)) {
    return [{ label: `A seasonal pick for ${profile.season}`, weight: SEASON_MATCH_WEIGHT }];
  }
  if (drink.category === "seasonal") {
    return [{ label: "A seasonal drink, but for a different time of year", weight: -1 }];
  }
  return [];
}

function scoreTimeOfDay(drink: Drink, profile: TasteProfile): RecommendationReason[] {
  if (profile.timeOfDay === "morning" && drink.tags.includes("strong")) {
    return [{ label: "A solid, wide-awake morning pick", weight: TIME_OF_DAY_WEIGHT }];
  }
  if (profile.timeOfDay === "evening" && drink.tags.includes("caffeine-free option")) {
    return [{ label: "Gentle enough for the evening", weight: TIME_OF_DAY_WEIGHT }];
  }
  return [];
}

function scoreExistingSelection(drink: Drink, currentCategory: DrinkCategoryId | undefined): RecommendationReason[] {
  if (!currentCategory || drink.category !== currentCategory) return [];
  return [{ label: "Similar to what you already have selected", weight: EXISTING_SELECTION_WEIGHT }];
}

function scoreDrink(drink: Drink, profile: TasteProfile, currentCategory: DrinkCategoryId | undefined): RecommendationReason[] {
  return [
    ...scoreTemperature(drink, profile),
    ...scoreCaffeine(drink, profile),
    ...scoreScale(profile.sweetness, deriveDrinkSweetness(drink), SWEETNESS_MATCH_WEIGHT, "Sweetness matches what you're after", "Sweeter/less sweet than you're looking for"),
    ...scoreScale(profile.bitterness, deriveDrinkBitterness(drink), BITTERNESS_MATCH_WEIGHT, "Intensity matches what you're after", "Bolder/milder than you're looking for"),
    ...scoreMilk(drink, profile),
    ...scoreTastePreference(drink, profile),
    ...scoreSeason(drink, profile),
    ...scoreTimeOfDay(drink, profile),
    ...scoreExistingSelection(drink, currentCategory),
  ];
}

function toScoredDrink(drink: Drink, reasons: RecommendationReason[]): ScoredDrink {
  const score = reasons.reduce((sum, reason) => sum + reason.weight, 0);
  const confidence = Math.max(0, Math.min(1, score / MAX_POSSIBLE_SCORE));
  return { drinkId: drink.id, score, confidence, reasons: reasons.filter((reason) => reason.weight !== 0) };
}

// ---------------------------------------------------------------------------
// Ingredient customization suggestions — "Recipe Compatibility Validation":
// every candidate is checked against the real compatibility rules
// `features/composer/` already enforces, never guessed.
// ---------------------------------------------------------------------------

interface IngredientCandidate {
  ingredientId: string;
  reason: string;
}

function candidateIngredients(profile: TasteProfile): IngredientCandidate[] {
  const candidates: IngredientCandidate[] = [];
  if (profile.sweetness >= 4) candidates.push({ ingredientId: "syrup", reason: "Extra sweetness, matching your preference" });
  if (profile.milkPreference === "creamy") candidates.push({ ingredientId: "cream", reason: "Rich and creamy, matching your preference" });
  if (profile.temperature === "iced") candidates.push({ ingredientId: "ice", reason: "Served cold, matching your iced preference" });
  if (profile.bitterness <= 2) candidates.push({ ingredientId: "milk", reason: "Softens the intensity, matching your milder preference" });
  if (profile.season === "fall") candidates.push({ ingredientId: "cinnamon", reason: "A seasonal touch for fall" });
  return candidates;
}

function resolveCustomizations(profile: TasteProfile, category: DrinkCategoryId): { suggested: SuggestedCustomization[]; excluded: SuggestedCustomization[] } {
  const suggested: SuggestedCustomization[] = [];
  const excluded: SuggestedCustomization[] = [];
  const seen = new Set<string>();

  for (const candidate of candidateIngredients(profile)) {
    if (seen.has(candidate.ingredientId)) continue;
    seen.add(candidate.ingredientId);
    const ingredient = resolveIngredient(candidate.ingredientId);
    if (!ingredient) continue;
    if (isIngredientCompatible(ingredient, category)) {
      suggested.push({ ingredientId: candidate.ingredientId, reason: candidate.reason });
    } else {
      excluded.push({ ingredientId: candidate.ingredientId, reason: `${ingredient.name} isn't offered with this drink` });
    }
  }

  return { suggested: suggested.slice(0, 3), excluded };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const MAX_ALTERNATIVES = 2;

export interface GenerateRecommendationOptions {
  /** "Existing recipe selections" — the customizer's current base-drink category, if any. Optional: a first-time visitor with nothing selected yet still gets a full recommendation. */
  currentCategory?: DrinkCategoryId;
  /** Generation timestamp, caller-supplied rather than read internally via `Date.now()` — the same "pass the clock in" pattern `data/questions.ts`'s `resolveCurrentSeason(date: Date)` already uses, and what keeps this function genuinely pure/deterministic for a fixed input (see `recommendationEngine.test.ts`). Defaults to `Date.now()` for real callers that don't care. */
  now?: number;
}

/**
 * Pure and deterministic for a fixed `now` — identical `profile`/`drinks`/
 * `options` always produce an identical `Recommendation` (no
 * `Math.random()`, no internal wall-clock read). Never returns an empty/
 * unexplained result: every drink in `drinks` is scored, so with a
 * non-empty catalog there is always a real top pick with at least a
 * neutral (possibly empty) reasons list.
 */
export function generateRecommendation(profile: TasteProfile, drinks: readonly Drink[], options: GenerateRecommendationOptions = {}): Recommendation | null {
  if (drinks.length === 0) return null;

  const scored = drinks
    .map((drink) => ({ drink, scored: toScoredDrink(drink, scoreDrink(drink, profile, options.currentCategory)) }))
    .sort((a, b) => b.scored.score - a.scored.score);

  const [topEntry, ...rest] = scored;
  if (!topEntry) return null;

  const { suggested, excluded } = resolveCustomizations(profile, topEntry.drink.category);
  const now = options.now ?? Date.now();

  return {
    id: `${now}-${topEntry.drink.id}`,
    createdAt: now,
    profile,
    top: topEntry.scored,
    alternatives: rest.slice(0, MAX_ALTERNATIVES).map((entry) => entry.scored),
    suggestedCustomizations: suggested,
    excludedIngredients: excluded,
  };
}

/** Re-exported for the panel/tests — every ingredient this sprint's candidates could name, so a UI never has to guess whether an id is real. */
export const CANDIDATE_INGREDIENT_IDS = INGREDIENTS.map((ingredient) => ingredient.id);
