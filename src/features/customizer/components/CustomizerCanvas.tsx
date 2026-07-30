"use client";

import { useMemo, useRef } from "react";

import { resolveIngredientLayers } from "@/features/composer/lib/resolveIngredientLayers";
import { CupCanvasLoader } from "@/features/hero-cup/components/CupCanvasLoader";
import { CupZoomControls } from "@/features/hero-cup/components/CupZoomControls";
import { useCupZoomControls } from "@/features/hero-cup/hooks/useCupZoomControls";
import { useCustomizerStore } from "@/stores/customizer-store";

import { resolvePartOverrides } from "../lib/resolvePartOverrides";

/** More modest than the Hero route's pull-back (1.25) — the "product" framing here is already tighter/closer than "hero", so a smaller initial zoom-out is enough for "comfortably inspect it." */
const CUSTOMIZER_INITIAL_ZOOM = 1.15;

/**
 * Reuses `CupCanvasLoader` directly rather than a second `next/dynamic`
 * boundary — it already keeps `three`/R3F out of the server bundle
 * internally (its own `dynamic(..., { ssr: false })` around `CupCanvas`),
 * so wrapping it again here would be redundant, not safer.
 *
 * The effective look is `selection` with any active hover/focus `preview`
 * merged on top — "Preview Before Commit": the 3D cup always reflects what
 * you're currently pointing at or focused on, not just what's committed.
 * Ingredient layers (Sprint 3.3) have no hover-preview concept of their own
 * — adding/removing/reordering is always a direct commit — so they're
 * resolved from `selection` alone, never `preview`.
 */
export function CustomizerCanvas() {
  const selection = useCustomizerStore((state) => state.selection);
  const preview = useCustomizerStore((state) => state.preview);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const zoomControls = useCupZoomControls({ targetRef: wrapperRef, initialZoom: CUSTOMIZER_INITIAL_ZOOM });

  const effective = useMemo(() => ({ ...selection, ...preview }), [selection, preview]);
  const { partOverrides, cupScale } = useMemo(() => resolvePartOverrides(effective), [effective]);
  const ingredientLayers = useMemo(() => resolveIngredientLayers(selection.ingredients), [selection.ingredients]);

  return (
    <div ref={wrapperRef} className="relative h-full w-full" style={{ touchAction: "none" }}>
      <CupCanvasLoader
        partOverrides={partOverrides}
        cupScale={cupScale}
        ingredientLayers={ingredientLayers}
        route="/customize"
        zoomSource={zoomControls.zoomStore}
      />
      <CupZoomControls controls={zoomControls} className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6" />
    </div>
  );
}
