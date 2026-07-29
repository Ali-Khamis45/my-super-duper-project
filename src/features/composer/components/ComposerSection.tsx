"use client";

import { Separator } from "@/components/ui/separator";

import { IngredientAnnouncer } from "./IngredientAnnouncer";
import { IngredientLibrary } from "./IngredientLibrary";
import { IngredientPresets } from "./IngredientPresets";
import { LayerStack } from "./LayerStack";
import { RecipeSummary } from "./RecipeSummary";

/** The Drink Composer's whole control surface — composed into `features/customizer/`'s panel rather than a second, separate page. Building your drink's recipe and your cup's cosmetics are one continuous session, not two disconnected flows. */
export function ComposerSection() {
  return (
    <div className="flex flex-col gap-4">
      <IngredientAnnouncer />
      <Separator />
      <RecipeSummary />
      <IngredientPresets />
      <IngredientLibrary />
      <div className="flex flex-col gap-2">
        <p className="text-foreground text-sm font-medium">Your layers</p>
        <LayerStack />
      </div>
    </div>
  );
}
