"use client";

import { useMemo } from "react";

import { resolveCategory } from "@/features/menu/data/categories";
import { resolveDrink } from "@/features/menu/data/drinks";
import { useCustomizerStore } from "@/stores/customizer-store";

import { resolveIngredient } from "../data/ingredients";
import { calculateIngredientsTotal } from "../lib/calculateIngredientsTotal";

/** "Drink name, ingredients list, layers order, values" — a read-only summary of the whole recipe, reusing the menu's own drink/category data rather than duplicating it. */
export function RecipeSummary() {
  const baseDrinkId = useCustomizerStore((state) => state.baseDrinkId);
  const ingredients = useCustomizerStore((state) => state.selection.ingredients);

  const drink = resolveDrink(baseDrinkId);
  const category = drink ? resolveCategory(drink.category) : null;

  // Sprint 3.8 fix: matches `PriceBreakdown.tsx`'s own "Memoize derived
  // totals" (the brief's Performance requirement) for the identical
  // drink-name/ingredients/total shape — this sibling had skipped it.
  const total = useMemo(() => (drink?.price ?? 0) + calculateIngredientsTotal(ingredients), [drink?.price, ingredients]);

  return (
    <div className="bg-muted/50 flex flex-col gap-1.5 rounded-lg p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-display text-base">{drink?.name ?? "Custom Drink"}</span>
        {category && <span className="text-muted-foreground text-xs uppercase">{category.label}</span>}
      </div>
      {ingredients.length > 0 && (
        <ul className="text-muted-foreground flex flex-col gap-0.5 text-xs">
          {ingredients.map((placement) => {
            const ingredient = resolveIngredient(placement.ingredientId);
            if (!ingredient) return null;
            return (
              <li key={placement.ingredientId} className="flex items-center justify-between">
                <span>
                  {ingredient.name}
                  {placement.quantity > 1 ? ` ×${placement.quantity}` : ""}
                </span>
                <span>${(ingredient.priceModifier * placement.quantity).toFixed(2)}</span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-border mt-1 flex items-center justify-between border-t pt-1.5 font-medium">
        <span>Total</span>
        <span className="font-display text-brand-accent-600 dark:text-brand-accent-400">${total.toFixed(2)}</span>
      </div>
    </div>
  );
}
