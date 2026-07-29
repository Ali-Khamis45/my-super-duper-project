import type { IngredientPreset } from "../types";

/**
 * Curated, built-in combos — distinct from Sprint 3.2's user-saved presets
 * (`stores/customizer-store.ts`'s `savePreset`/`loadPreset`, still real and
 * unchanged). These are starting points a user picks *from*, not something
 * they created; applying one calls the same `applyIngredientPreset` store
 * action either way, and both kinds of preset flow through the same
 * `preset:applied` event.
 */
export const INGREDIENT_PRESETS: readonly IngredientPreset[] = [
  {
    id: "classic-mocha",
    name: "Classic Mocha",
    description: "Chocolate drizzle and whipped cream.",
    ingredientIds: ["chocolate", "cream"],
  },
  {
    id: "cinnamon-dream",
    name: "Cinnamon Dream",
    description: "Cinnamon, caramel, and steamed milk.",
    ingredientIds: ["cinnamon", "caramel", "milk"],
  },
  {
    id: "iced-and-sweet",
    name: "Iced & Sweet",
    description: "Ice, caramel, and vanilla syrup.",
    ingredientIds: ["ice", "caramel", "syrup"],
  },
  {
    id: "the-works",
    name: "The Works",
    description: "Chocolate, caramel, sprinkles, and whipped cream.",
    ingredientIds: ["chocolate", "caramel", "sprinkles", "cream"],
  },
];
