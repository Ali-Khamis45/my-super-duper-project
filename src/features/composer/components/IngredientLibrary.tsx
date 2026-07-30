"use client";

import { Check } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCustomizerStore } from "@/stores/customizer-store";

import { isIngredientCompatible } from "../data/ingredients";
import { useIngredientsQuery } from "../hooks/useIngredientsQuery";

/** The native HTML5 drag-and-drop MIME type the drop zone (`CustomizerExperience`'s canvas wrapper) reads. */
export const INGREDIENT_DRAG_TYPE = "application/x-coffeshop-ingredient";

/**
 * Click-to-add is the fully accessible primary path (a real `<button>` —
 * keyboard Enter/Space and touch tap both just work, no extra wiring).
 * Drag-to-place (native HTML5 DnD, `draggable`) is a real, additional
 * desktop-only interaction layered on top — native DnD has poor touch
 * support and no keyboard path by design, so it's never the only way to
 * add an ingredient, matching "Drag-to-place *where applicable*."
 *
 * Hovering a compatible, not-yet-added ingredient sets a transient preview
 * (the same `setPreview` mechanism Sprint 3.2's cosmetic swatches use) —
 * "Hover Preview," and genuinely showing the cup as it would look, not
 * just a CSS highlight.
 */
export function IngredientLibrary() {
  const baseDrinkCategory = useCustomizerStore((state) => state.baseDrinkCategory);
  const selection = useCustomizerStore((state) => state.selection);
  const preview = useCustomizerStore((state) => state.preview);
  const addIngredient = useCustomizerStore((state) => state.addIngredient);
  const setPreview = useCustomizerStore((state) => state.setPreview);
  const { data: ingredients, isLoading } = useIngredientsQuery();

  if (isLoading || !ingredients) {
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="text-foreground text-sm font-medium">Ingredients</legend>
        <div className="grid grid-cols-3 gap-2" aria-busy="true" aria-label="Loading ingredients">
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-foreground text-sm font-medium">Ingredients</legend>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Ingredient library">
        {ingredients.map((ingredient) => {
          const Icon = ingredient.icon;
          const compatible = isIngredientCompatible(ingredient, baseDrinkCategory);
          const alreadyAdded = selection.ingredients.some((entry) => entry.ingredientId === ingredient.id);
          const disabled = !compatible || alreadyAdded;
          const isPreviewing = preview?.ingredients?.some((entry) => entry.ingredientId === ingredient.id) ?? false;

          function handlePreview(active: boolean) {
            if (disabled) return;
            setPreview(active ? { ingredients: [...selection.ingredients, { ingredientId: ingredient.id, quantity: 1 }] } : null);
          }

          return (
            <Tooltip key={ingredient.id}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-label={`Add ${ingredient.name}${disabled ? (alreadyAdded ? " (already added)" : " (not available for this drink)") : ""}`}
                    disabled={disabled}
                    draggable={!disabled}
                    onDragStart={(event) => {
                      event.dataTransfer.setData(INGREDIENT_DRAG_TYPE, ingredient.id);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    onMouseEnter={() => handlePreview(true)}
                    onMouseLeave={() => handlePreview(false)}
                    onFocus={() => handlePreview(true)}
                    onBlur={() => handlePreview(false)}
                    onClick={() => {
                      addIngredient(ingredient.id);
                      handlePreview(false);
                    }}
                  />
                }
                className={cn(
                  "focus-visible:ring-ring flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs transition-all duration-(--duration-fast) ease-(--ease-premium) focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
                  alreadyAdded ? "border-brand-accent-500 bg-brand-accent-500/10" : "border-border hover:border-brand-accent-400/60",
                  isPreviewing && "border-brand-accent-400/60 bg-brand-accent-500/5",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="max-w-16 truncate">{ingredient.name}</span>
                {alreadyAdded && <Check className="text-brand-accent-600 dark:text-brand-accent-400 size-3" aria-hidden="true" />}
              </TooltipTrigger>
              <TooltipContent>
                {!compatible
                  ? "Not available for this drink"
                  : alreadyAdded
                    ? "Already added"
                    : `+$${ingredient.priceModifier.toFixed(2)}`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </fieldset>
  );
}
