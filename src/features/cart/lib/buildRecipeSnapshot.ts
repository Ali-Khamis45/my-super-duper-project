import { calculateIngredientsTotal } from "@/features/composer/lib/calculateIngredientsTotal";
import { resolveDrink } from "@/features/menu/data/drinks";
import type { DrinkCategoryId } from "@/features/menu/types";
import type { CustomizerSelection } from "@/stores/customizer-store";

import type { RecipeSnapshot } from "../types";

export interface BuildRecipeSnapshotInput {
  baseDrinkId: string;
  /** Sprint 5.3 — the real backend `Product.Id` (`customizer-store`'s `baseDrinkProductId`). Missing/`undefined` means this snapshot returns `null`, same as an unresolvable `baseDrinkId` — a cart entry with no real product to order against is exactly the "fabricated snapshot" this function's own contract already refuses to build. */
  productId: string | undefined;
  baseDrinkCategory: DrinkCategoryId;
  selection: CustomizerSelection;
  appliedRecommendationId: string | null;
}

export interface BuildRecipeSnapshotOptions {
  /** Caller-supplied rather than read internally (`crypto.randomUUID()`/`Date.now()`) — the same "pass the nondeterminism in" pattern `features/concierge/lib/recommendationEngine.ts`'s `now` option established, so this function stays genuinely pure and testable. Real callers omit both and get real values. */
  id?: string;
  now?: number;
}

/**
 * "No UI-only reconstruction. Persist the actual recipe model" — the one
 * place a live `customizer-store` snapshot becomes a durable
 * `RecipeSnapshot`. Reuses `calculateIngredientsTotal` (the same formula
 * `RecipeSummary.tsx` displays) rather than a second pricing path — "reuse
 * existing... pricing model," the brief's own words. Returns `null` if the
 * base drink can't be resolved (a real, if unlikely, integrity check —
 * never fabricate a snapshot for a drink that doesn't exist).
 */
export function buildRecipeSnapshot(input: BuildRecipeSnapshotInput, options: BuildRecipeSnapshotOptions = {}): RecipeSnapshot | null {
  const drink = resolveDrink(input.baseDrinkId);
  if (!drink || !input.productId) return null;

  const ingredientsTotal = calculateIngredientsTotal(input.selection.ingredients);
  const unitPrice = drink.price + ingredientsTotal;

  return {
    id: options.id ?? crypto.randomUUID(),
    createdAt: options.now ?? Date.now(),
    baseDrinkId: input.baseDrinkId,
    productId: input.productId,
    baseDrinkCategory: input.baseDrinkCategory,
    baseDrinkName: drink.name,
    selection: input.selection,
    unitPrice,
    appliedRecommendationId: input.appliedRecommendationId,
  };
}
