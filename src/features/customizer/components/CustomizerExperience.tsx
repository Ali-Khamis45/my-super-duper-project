"use client";

import { useEffect } from "react";

import { appEvents } from "@/engine/events";
import { INGREDIENT_DRAG_TYPE } from "@/features/composer/components/IngredientLibrary";
import { isIngredientCompatible, resolveIngredient } from "@/features/composer/data/ingredients";
import { resolveDrink } from "@/features/menu/data/drinks";
import { useCustomizerStore } from "@/stores/customizer-store";

import { CustomizerCanvas } from "./CustomizerCanvas";
import { CustomizerPanel } from "./CustomizerPanel";

interface CustomizerExperienceProps {
  /** From `/customize?drink=<id>` — resolved against the menu catalog, not duplicated. `undefined`/unresolvable falls back to the store's own default (`baseDrinkId: "classic-espresso"`). */
  drinkId?: string;
}

/**
 * Stacked on mobile (canvas on top, panel scrolls below — both real,
 * usable content, not a drawer/sheet added just to hide the panel), side
 * by side from `lg`. The canvas's wrapping div needs a real height for
 * `CupCanvas`'s own `h-full` to resolve against — `flex-1` inside this
 * `min-h-screen` flex container provides it at both breakpoints.
 *
 * That same wrapping div is also "Drag-to-place"'s drop zone — a DOM-level
 * drop target over the 3D view, not 3D-space raycasted placement (a much
 * bigger undertaking genuinely out of this sprint's scope). Compatibility
 * is re-checked here, not just trusted from the drag source — "strict
 * rules" enforced at every entry point an ingredient can be added from,
 * matching `IngredientLibrary`'s own disabled-button check.
 *
 * Sprint 3.9 fix: `lg:h-auto` previously let flexbox's default
 * cross-axis stretch grow this column to match the options panel's own
 * (much taller) content height — the customize panel's six swatch groups
 * plus price/combos routinely push it past 1200px, badly distorting the
 * canvas's aspect ratio and, via `CameraRig`'s aspect-driven horizontal
 * FOV, cropping the cup far more aggressively than any authored preset
 * intends. Capped to the viewport height and made sticky instead — a real
 * "premium configurator" pattern (the 3D view stays in place while you
 * scroll options), not just a framing patch.
 */
export function CustomizerExperience({ drinkId }: CustomizerExperienceProps) {
  const setBaseDrink = useCustomizerStore((state) => state.setBaseDrink);
  const baseDrinkCategory = useCustomizerStore((state) => state.baseDrinkCategory);
  const addIngredient = useCustomizerStore((state) => state.addIngredient);

  useEffect(() => {
    appEvents.emit({ name: "customizer:opened" });
    return () => appEvents.emit({ name: "customizer:closed" });
  }, []);

  useEffect(() => {
    if (!drinkId) return;
    const drink = resolveDrink(drinkId);
    if (!drink) return;
    setBaseDrink(drink.id, drink.category);
  }, [drinkId, setBaseDrink]);

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    const ingredientId = event.dataTransfer.getData(INGREDIENT_DRAG_TYPE);
    if (!ingredientId) return;
    event.preventDefault();
    const ingredient = resolveIngredient(ingredientId);
    if (!ingredient || !isIngredientCompatible(ingredient, baseDrinkCategory)) return;
    addIngredient(ingredientId);
    appEvents.emit({ name: "ingredient:dropped", ingredientId, targetSlot: "cup" });
  }

  return (
    <div id="main-content" className="flex min-h-screen flex-col pt-20 lg:flex-row lg:pt-24">
      <div
        className="relative h-[55vh] w-full lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] lg:flex-1"
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes(INGREDIENT_DRAG_TYPE)) event.preventDefault();
        }}
        onDrop={handleDrop}
      >
        <CustomizerCanvas />
      </div>
      <aside className="border-border w-full border-t lg:h-auto lg:w-96 lg:border-t-0 lg:border-l">
        <CustomizerPanel />
      </aside>
    </div>
  );
}
