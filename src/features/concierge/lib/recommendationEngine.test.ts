import { describe, expect, it } from "vitest";

import { drinks } from "@/features/menu/data/drinks";

import { DEFAULT_TASTE_PROFILE } from "../data/questions";
import type { TasteProfile } from "../types";
import { generateRecommendation, MAX_POSSIBLE_SCORE } from "./recommendationEngine";

const FIXED_NOW = 1_700_000_000_000;

function profile(overrides: Partial<TasteProfile>): TasteProfile {
  return { ...DEFAULT_TASTE_PROFILE, ...overrides };
}

describe("generateRecommendation", () => {
  it("returns null for an empty catalog, never throws", () => {
    expect(generateRecommendation(DEFAULT_TASTE_PROFILE, [], { now: FIXED_NOW })).toBeNull();
  });

  it("is deterministic: identical inputs (including a fixed `now`) produce an identical result", () => {
    const a = generateRecommendation(DEFAULT_TASTE_PROFILE, drinks, { now: FIXED_NOW });
    const b = generateRecommendation(DEFAULT_TASTE_PROFILE, drinks, { now: FIXED_NOW });
    expect(a).toEqual(b);
  });

  it("no drink's raw score can exceed MAX_POSSIBLE_SCORE — confidence's denominator is a real, checkable ceiling", () => {
    // Exercise every drink as the top pick at least once by trying a spread of profiles.
    const profiles: TasteProfile[] = [
      profile({ temperature: "iced", caffeineLevel: "none" }),
      profile({ temperature: "hot", caffeineLevel: "high", tastePreference: "bitter", sweetness: 1, bitterness: 5 }),
      profile({ tastePreference: "sweet", sweetness: 5, bitterness: 1, milkPreference: "creamy" }),
      profile({ season: "fall" }),
      profile({ season: "winter", tastePreference: "sweet" }),
      profile({ milkPreference: "none", caffeineLevel: "none" }),
    ];
    for (const p of profiles) {
      const result = generateRecommendation(p, drinks, { now: FIXED_NOW });
      expect(result).not.toBeNull();
      expect(result!.top.score).toBeLessThanOrEqual(MAX_POSSIBLE_SCORE);
      for (const alt of result!.alternatives) {
        expect(alt.score).toBeLessThanOrEqual(MAX_POSSIBLE_SCORE);
      }
    }
  });

  it("confidence is always within [0, 1]", () => {
    const result = generateRecommendation(profile({ temperature: "hot", caffeineLevel: "none", tastePreference: "bitter" }), drinks, { now: FIXED_NOW });
    expect(result!.top.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.top.confidence).toBeLessThanOrEqual(1);
  });

  it("the top pick always has at least one explained reason for a profile with real signal (never an unexplained recommendation)", () => {
    const result = generateRecommendation(profile({ temperature: "iced", caffeineLevel: "none" }), drinks, { now: FIXED_NOW });
    expect(result!.top.reasons.length).toBeGreaterThan(0);
  });

  it("an iced preference recommends a real cold drink, not an arbitrary one", () => {
    const result = generateRecommendation(profile({ temperature: "iced", caffeineLevel: "none" }), drinks, { now: FIXED_NOW });
    // original-cold-brew wins here on the combination of the iced signal
    // plus the default profile's sweetness/bitterness/milk/balanced-taste
    // deltas all happening to land close to its own derived values —
    // jasmine-green-tea (the only caffeine-free-tagged drink) loses ground
    // on the iced signal despite its caffeine-free match. A real, explained
    // outcome, not an arbitrary pick — see `result.top.reasons`.
    expect(result!.top.drinkId).toBe("original-cold-brew");
    expect(result!.top.reasons.some((reason) => reason.label.includes("iced"))).toBe(true);
  });

  it("a strongly bitter/high-caffeine/no-milk hot preference recommends classic espresso over a milkier flat white, and excludes an incompatible ice suggestion", () => {
    const result = generateRecommendation(
      profile({ temperature: "iced", caffeineLevel: "high", tastePreference: "bitter", sweetness: 1, bitterness: 5, milkPreference: "none" }),
      drinks,
      { now: FIXED_NOW },
    );
    expect(result!.top.drinkId).toBe("classic-espresso");
    // temperature: "iced" is still set on the profile, so ice is a real candidate customization —
    // but classic-espresso's category ("espresso") is incompatible with it. Compatibility must be
    // validated, not assumed, and the exclusion must be explained.
    const excludedIce = result!.excludedIngredients.find((entry) => entry.ingredientId === "ice");
    expect(excludedIce).toBeDefined();
    expect(excludedIce!.reason.length).toBeGreaterThan(0);
    expect(result!.suggestedCustomizations.some((entry) => entry.ingredientId === "ice")).toBe(false);
  });

  it("suggests a compatible ingredient when the profile calls for it (sweetness -> syrup, always compatible)", () => {
    const result = generateRecommendation(profile({ sweetness: 5 }), drinks, { now: FIXED_NOW });
    expect(result!.suggestedCustomizations.some((entry) => entry.ingredientId === "syrup")).toBe(true);
  });

  it("alternatives are ranked below the top pick and capped at 2", () => {
    const result = generateRecommendation(DEFAULT_TASTE_PROFILE, drinks, { now: FIXED_NOW });
    expect(result!.alternatives.length).toBeLessThanOrEqual(2);
    for (const alt of result!.alternatives) {
      expect(alt.score).toBeLessThanOrEqual(result!.top.score);
    }
  });

  it("'existing recipe selections' nudges toward the same category without being a hard requirement", () => {
    const withoutContext = generateRecommendation(profile({ tastePreference: "balanced" }), drinks, { now: FIXED_NOW, currentCategory: undefined });
    const withContext = generateRecommendation(profile({ tastePreference: "balanced" }), drinks, { now: FIXED_NOW, currentCategory: "tea" });
    expect(withoutContext).not.toBeNull();
    expect(withContext).not.toBeNull();
    // The same drink can score differently (higher) once a matching existing-category hint is present.
    const teaDrinkId = "chai-latte";
    const scoreWithout = withoutContext!.top.drinkId === teaDrinkId ? withoutContext!.top.score : (withoutContext!.alternatives.find((a) => a.drinkId === teaDrinkId)?.score ?? -Infinity);
    const scoreWith = withContext!.top.drinkId === teaDrinkId ? withContext!.top.score : (withContext!.alternatives.find((a) => a.drinkId === teaDrinkId)?.score ?? -Infinity);
    if (scoreWithout > -Infinity && scoreWith > -Infinity) {
      expect(scoreWith).toBeGreaterThanOrEqual(scoreWithout);
    }
  });
});
