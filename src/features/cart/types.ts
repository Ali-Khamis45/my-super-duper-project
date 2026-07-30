import type { CustomizerSelection } from "@/stores/customizer-store";
import type { DrinkCategoryId } from "@/features/menu/types";

/**
 * Sprint 3.6 — "the whole entire Recipe Snapshot," the user's own words: a
 * complete, self-contained copy of everything needed to redisplay, re-edit,
 * or re-add this exact recipe, captured at the moment it's added to the
 * cart. Deliberately shaped as a direct mirror of `customizer-store`'s own
 * live state (`selection` + the `baseDrinkId`/`baseDrinkCategory` context
 * that already lives alongside it) — building a snapshot is a straight
 * copy of that state, and restoring one for editing is setting those same
 * fields back, with "no data transformations or state reconstruction" in
 * either direction.
 *
 * "Layer order" (the brief's own field) is *not* a separate property here
 * — `selection.ingredients`' array order already *is* stack order
 * (`features/composer/lib/resolveIngredientLayers.ts` reads it directly),
 * so duplicating it as a second field would be exactly the kind of
 * parallel model this sprint's brief explicitly forbids.
 */
export interface RecipeSnapshot {
  /** Stable identity for this specific recipe snapshot — distinct from `baseDrinkId` (the menu item) since two snapshots of the same drink with different customizations are different recipes. */
  id: string;
  createdAt: number;
  baseDrinkId: string;
  /** Sprint 5.3 — the real backend `Product.Id`, required to submit this recipe through `CreateOrderFromCart`; see `buildRecipeSnapshot.ts`'s own doc comment for why a snapshot without one is never built at all. */
  productId: string;
  baseDrinkCategory: DrinkCategoryId;
  /** Denormalized at snapshot time — a cart/favorite/order should still show what was actually ordered even if the live menu catalog's copy for this drink ever changes. */
  baseDrinkName: string;
  selection: CustomizerSelection;
  /** The computed price for *one* unit of this exact recipe, frozen at snapshot time — see `lib/buildRecipeSnapshot.ts`. Never recomputed later from the live catalog, for the same "what was actually ordered" reason `baseDrinkName` is denormalized. */
  unitPrice: number;
  /** "Applied AI recommendations (if applicable)" — `customizer-store`'s `appliedRecommendationId` at snapshot time, or `null` for a recipe composed without one. */
  appliedRecommendationId: string | null;
}

export interface CartItem {
  snapshot: RecipeSnapshot;
  quantity: number;
}
