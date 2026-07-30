"use client";

import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/design-system/primitives/GlassSurface";

import type { useCupZoomControls } from "../hooks/useCupZoomControls";

interface CupZoomControlsProps {
  controls: ReturnType<typeof useCupZoomControls>;
  className?: string;
  /** Sprint 3.9, Task 1 — an optional `data-onboarding` spotlight hook; `features/onboarding/` is the only caller that passes one. */
  "data-onboarding"?: string;
}

/**
 * Sprint 3.9, Task 2 — the visible half of `useCupZoomControls`: a slider
 * plus zoom-in/out/reset/fit-to-screen buttons. Deliberately a thin view
 * over that hook's state (no zoom math here) so any other cup viewer this
 * project adds later gets identical controls by calling the same hook, not
 * by re-deriving zoom behavior. `zoom` is inverted for the slider's own
 * `min`/`max` (a *smaller* number means "closer" in this hook's own
 * distance-multiplier convention, which reads backwards on a left-to-right
 * "zoom out -> zoom in" slider) — the label announces direction explicitly
 * rather than relying on the raw number's sign to communicate it.
 */
export function CupZoomControls({ controls, className, "data-onboarding": dataOnboarding }: CupZoomControlsProps) {
  const { zoom, setZoom, zoomIn, zoomOut, reset, fitToScreen, min, max } = controls;

  return (
    <GlassSurface
      elevation="sm"
      className={`flex items-center gap-1.5 px-2 py-1.5 ${className ?? ""}`}
      data-onboarding={dataOnboarding}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Zoom in"
        onClick={zoomIn}
        disabled={zoom <= min}
      >
        <ZoomIn aria-hidden="true" />
      </Button>
      <input
        type="range"
        aria-label="Cup zoom level"
        min={min}
        max={max}
        step={0.01}
        // The slider reads left (zoomed out) -> right (zoomed in), the
        // inverse of the underlying distance-multiplier value (smaller =
        // closer) — flip both the displayed value and the input direction
        // so the control feels natural without changing the hook's own
        // "1 = authored default" convention anywhere else.
        value={max + min - zoom}
        onChange={(event) => setZoom(max + min - Number(event.target.value))}
        className="accent-brand-accent-500 h-1.5 w-20 cursor-pointer sm:w-28"
      />
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Zoom out"
        onClick={zoomOut}
        disabled={zoom >= max}
      >
        <ZoomOut aria-hidden="true" />
      </Button>
      <div className="bg-border/60 mx-0.5 h-5 w-px" aria-hidden="true" />
      <Button variant="ghost" size="icon-sm" aria-label="Reset view" onClick={reset}>
        <RotateCcw aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon-sm" aria-label="Fit to screen" onClick={fitToScreen}>
        <Maximize2 aria-hidden="true" />
      </Button>
    </GlassSurface>
  );
}
