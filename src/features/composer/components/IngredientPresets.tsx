"use client";

import { Button } from "@/components/ui/button";
import { useCustomizerStore } from "@/stores/customizer-store";

import { INGREDIENT_PRESETS } from "../data/presets";
import { isIngredientCompatible, resolveIngredient } from "../data/ingredients";

/** Curated combos, distinct from Sprint 3.2's user-saved presets — starting points a user picks *from*, not something they created. Only offered when every ingredient in the combo is actually compatible with the current base drink, so applying one never silently violates the same "strict rules" the library itself enforces. */
export function IngredientPresets() {
  const baseDrinkCategory = useCustomizerStore((state) => state.baseDrinkCategory);
  const applyIngredientPreset = useCustomizerStore((state) => state.applyIngredientPreset);

  const availablePresets = INGREDIENT_PRESETS.filter((preset) =>
    preset.ingredientIds.every((id) => {
      const ingredient = resolveIngredient(id);
      return ingredient && isIngredientCompatible(ingredient, baseDrinkCategory);
    }),
  );

  if (availablePresets.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-foreground text-sm font-medium">Popular combos</p>
      <div className="flex flex-wrap gap-2">
        {availablePresets.map((preset) => (
          <Button
            key={preset.id}
            variant="outline"
            size="sm"
            title={preset.description}
            onClick={() => applyIngredientPreset(preset.ingredientIds, preset.id)}
          >
            {preset.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
