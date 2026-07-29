import type { DrinkCategoryId } from "@/features/menu/types";

/**
 * Sprint 3.5's input signals, exactly as named in the brief. Every field
 * has a sensible, real default (season/time of day default from the
 * actual current date, applied client-side shortly after mount — see
 * `stores/concierge-store.ts`'s `applyCurrentDateDefaults` — the rest
 * default to a neutral "balanced"/"either" middle so an unanswered
 * questionnaire still produces a real, explainable recommendation rather
 * than an empty state).
 */
export interface TasteProfile {
  tastePreference: "sweet" | "bitter" | "balanced";
  /** 1 (barely sweet) – 5 (very sweet). */
  sweetness: number;
  /** 1 (mild) – 5 (bold/intense). */
  bitterness: number;
  milkPreference: "none" | "light" | "creamy";
  temperature: "hot" | "iced" | "either";
  caffeineLevel: "none" | "low" | "regular" | "high";
  season: "spring" | "summer" | "fall" | "winter";
  timeOfDay: "morning" | "afternoon" | "evening";
}

/** One factor that moved a drink's score — always attached to the signal that produced it, never a generic "matched your taste" string. Positive weight = it helped the drink rank higher; negative = it held the drink back. */
export interface RecommendationReason {
  label: string;
  weight: number;
}

export interface ScoredDrink {
  drinkId: string;
  score: number;
  /** 0-1 — `score` normalized against the best-possible score for this profile, not a raw/unbounded number. */
  confidence: number;
  reasons: RecommendationReason[];
}

/** A compatible ingredient the engine suggests on top of the recommended drink — validated, not guessed (see `isRecommendedIngredientCompatible`). */
export interface SuggestedCustomization {
  ingredientId: string;
  reason: string;
}

export interface Recommendation {
  id: string;
  createdAt: number;
  profile: TasteProfile;
  top: ScoredDrink;
  /** Ranked, next-best drinks — same scoring pass, not a second recommendation call. */
  alternatives: ScoredDrink[];
  suggestedCustomizations: SuggestedCustomization[];
  /** Ingredients that would have supported the profile but are incompatible with `top`'s category — the brief's explicit "which ingredients caused exclusions." */
  excludedIngredients: SuggestedCustomization[];
}

export interface QuestionOption<TValue extends string> {
  value: TValue;
  label: string;
}

/** One questionnaire field's definition — `data/questions.ts` is the full, typed set. Generic over the exact `TasteProfile` key so an option list can never drift out of sync with the field it configures. */
export interface TasteProfileQuestion<TKey extends keyof TasteProfile = keyof TasteProfile> {
  key: TKey;
  legend: string;
  options: readonly QuestionOption<Extract<TasteProfile[TKey], string>>[];
}

export type { DrinkCategoryId };
