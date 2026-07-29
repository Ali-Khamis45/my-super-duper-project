"use client";

import { useMemo } from "react";

import { resolveIngredientLayers } from "@/features/composer/lib/resolveIngredientLayers";
import { CupCanvasLoader } from "@/features/hero-cup/components/CupCanvasLoader";
import { useConciergeStore } from "@/stores/concierge-store";

/**
 * Reuses `CupCanvasLoader` directly, same reasoning as
 * `features/customizer/`'s `CustomizerCanvas.tsx`. Two real integration
 * points, not cosmetic: `cameraPreset` switches from `"hero"` to `"ai"` —
 * `CameraRig`'s first live second-preset transition — once a
 * recommendation exists (the Architecture Freeze's "3D reveal moment");
 * `ingredientLayers` reuses `features/composer/`'s own resolver to render
 * the recommendation's `suggestedCustomizations` as real 3D layers on the
 * cup, the same rendering `/customize` uses for a user's own picks — "no
 * duplicated models," seeing the actual suggestion, not just reading about it.
 */
export function ConciergeCanvas() {
  const lastRecommendation = useConciergeStore((state) => state.lastRecommendation);

  const ingredientLayers = useMemo(() => {
    if (!lastRecommendation) return undefined;
    return resolveIngredientLayers(lastRecommendation.suggestedCustomizations.map((customization) => ({ ingredientId: customization.ingredientId, quantity: 1 })));
  }, [lastRecommendation]);

  return (
    <CupCanvasLoader
      cameraPreset={lastRecommendation ? "ai" : "hero"}
      ingredientLayers={ingredientLayers}
      route="/concierge"
    />
  );
}
