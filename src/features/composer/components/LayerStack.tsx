"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Minus, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fadeUp } from "@/engine/motion/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import {
  MAX_INGREDIENT_QUANTITY,
  MIN_INGREDIENT_QUANTITY,
  useCustomizerStore,
} from "@/stores/customizer-store";

import { resolveIngredient } from "../data/ingredients";

/**
 * "Ingredient Ordering" via up/down buttons, not drag-reorder — a real,
 * deliberate accessibility call: drag-to-reorder has no native keyboard
 * equivalent without extra ARIA machinery this sprint doesn't need to
 * invent, while up/down buttons are inherently keyboard- and
 * touch-operable for free. The list order *is* the 3D stack order
 * (`resolveIngredientLayers.ts` reads array position directly), so
 * reordering here has a real, visible effect, not just a list re-sort.
 */
export function LayerStack() {
  const ingredients = useCustomizerStore((state) => state.selection.ingredients);
  const removeIngredient = useCustomizerStore((state) => state.removeIngredient);
  const updateIngredientQuantity = useCustomizerStore((state) => state.updateIngredientQuantity);
  const reorderIngredient = useCustomizerStore((state) => state.reorderIngredient);
  const reducedMotion = usePrefersReducedMotion();

  if (ingredients.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No ingredients added yet — pick some above.</p>
    );
  }

  return (
    <ol className="flex flex-col gap-2" aria-label="Ingredient layers, bottom to top">
      {/* Sprint 3.8 fix: add/remove/reorder — exactly what these controls
          do — previously snapped instantly, unlike `DrinkCard.tsx`'s
          `layout` handling of the same "list reflow" shape. `layout`
          animates the reorder-driven position swap; `AnimatePresence`
          animates real add/remove. */}
      <AnimatePresence initial={false}>
        {ingredients.map((placement, index) => {
          const ingredient = resolveIngredient(placement.ingredientId);
          if (!ingredient) return null;
          const Icon = ingredient.icon;

          return (
            <motion.li
              key={placement.ingredientId}
              layout={!reducedMotion}
              initial={reducedMotion ? false : "hidden"}
              animate={reducedMotion ? undefined : "visible"}
              exit={reducedMotion ? undefined : "hidden"}
              variants={fadeUp}
              className="border-border flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm"
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">{ingredient.name}</span>

              <div
                className="flex items-center gap-0.5"
                role="group"
                aria-label={`${ingredient.name} quantity`}
              >
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Decrease ${ingredient.name} quantity`}
                  disabled={placement.quantity <= MIN_INGREDIENT_QUANTITY}
                  onClick={() =>
                    updateIngredientQuantity(placement.ingredientId, placement.quantity - 1)
                  }
                >
                  <Minus className="size-3" aria-hidden="true" />
                </Button>
                <span className="w-4 text-center tabular-nums" aria-hidden="true">
                  {placement.quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Increase ${ingredient.name} quantity`}
                  disabled={placement.quantity >= MAX_INGREDIENT_QUANTITY}
                  onClick={() =>
                    updateIngredientQuantity(placement.ingredientId, placement.quantity + 1)
                  }
                >
                  <Plus className="size-3" aria-hidden="true" />
                </Button>
              </div>

              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${ingredient.name} down the stack`}
                disabled={index === ingredients.length - 1}
                onClick={() => reorderIngredient(placement.ingredientId, "down")}
              >
                <ArrowDown className="size-3.5" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${ingredient.name} up the stack`}
                disabled={index === 0}
                onClick={() => reorderIngredient(placement.ingredientId, "up")}
              >
                <ArrowUp className="size-3.5" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${ingredient.name}`}
                onClick={() => removeIngredient(placement.ingredientId)}
              >
                <X className="size-3.5" aria-hidden="true" />
              </Button>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}
