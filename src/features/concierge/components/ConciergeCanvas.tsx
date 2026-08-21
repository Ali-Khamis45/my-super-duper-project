"use client";

import { useMemo, useRef } from "react";

import { resolveIngredientLayers } from "@/features/composer/lib/resolveIngredientLayers";
import { CupCanvasLoader } from "@/features/hero-cup/components/CupCanvasLoader";
import { CupZoomControls } from "@/features/hero-cup/components/CupZoomControls";
import { useCupZoomControls } from "@/features/hero-cup/hooks/useCupZoomControls";
import { useConciergeStore } from "@/stores/concierge-store";

/** Matches `CustomizerCanvas`'s own "product" framing — closer than the Hero route's pull-back, comfortable for inspecting a single recommended drink. */
const CONCIERGE_INITIAL_ZOOM = 1.15;

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
 *
 * `CupZoomControls`/`useCupZoomControls` — the same real zoom slider + reset/
 * fit-to-screen bar `CustomizerCanvas` already has — were missing here
 * entirely; drag/touch/keyboard rotation already works on every route (it's
 * built into `CupCanvasLoader` itself, not gated by `route`), but the visible
 * scale control and the explicit "reset view" affordance were not, a real,
 * fixable inconsistency between the two product-inspection views.
 */
export function ConciergeCanvas() {
  const lastRecommendation = useConciergeStore((state) => state.lastRecommendation);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // requireModifierForWheelZoom: same fix as `CustomizerCanvas` — this canvas sits
  // beside the questionnaire/recommendation panel the user needs to scroll to
  // reach, so a bare wheel over the cup must scroll the page, not zoom it.
  const zoomControls = useCupZoomControls({ targetRef: wrapperRef, initialZoom: CONCIERGE_INITIAL_ZOOM, requireModifierForWheelZoom: true });

  const ingredientLayers = useMemo(() => {
    if (!lastRecommendation) return undefined;
    return resolveIngredientLayers(lastRecommendation.suggestedCustomizations.map((customization) => ({ ingredientId: customization.ingredientId, quantity: 1 })));
  }, [lastRecommendation]);

  return (
    <div ref={wrapperRef} className="relative h-full w-full" style={{ touchAction: "none" }}>
      <CupCanvasLoader
        cameraPreset={lastRecommendation ? "ai" : "hero"}
        ingredientLayers={ingredientLayers}
        route="/concierge"
        zoomSource={zoomControls.zoomStore}
      />
      <CupZoomControls controls={zoomControls} className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6" />
    </div>
  );
}
