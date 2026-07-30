"use client";

import { useRef } from "react";

import { useCupZoomControls } from "../hooks/useCupZoomControls";
import { CupCanvasLoader } from "./CupCanvasLoader";
import { CupZoomControls } from "./CupZoomControls";

/** Pulled back from the "hero" preset's own authored distance (1) — Sprint 3.9's "the cup should initially appear smaller... similar to premium product configurators." Reset View returns here, not to 1. */
const HERO_INITIAL_ZOOM = 1.25;

/**
 * Sprint 3.9 — the thin client boundary `CupCanvasLoader`'s own doc comment
 * anticipates ("this thin wrapper exists so Hero.tsx can stay a Server
 * Component"): owns the wrapper ref + zoom-control state so `Hero.tsx`
 * itself never needs `"use client"`.
 */
export function HeroCupViewport() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const zoomControls = useCupZoomControls({ targetRef: wrapperRef, initialZoom: HERO_INITIAL_ZOOM });

  return (
    <div ref={wrapperRef} className="hero-canvas-wrapper absolute inset-0" style={{ touchAction: "none" }}>
      <CupCanvasLoader zoomSource={zoomControls.zoomStore} />
      {/* Sprint 3.9, Task 1 — a small, roughly-centered marker, not the full
          `inset-0` wrapper above: the cup is a WebGL-rendered object with no
          real DOM bounding box of its own, and spotlighting the *entire*
          full-bleed hero section made `TutorialOverlay`'s edge-relative card
          placement push the card off-screen (a real bug, found via manual
          browser verification — the target rect's own edges were
          essentially the viewport's edges). This approximates where the cup
          actually sits at the default framing — good enough for a one-time
          spotlight, not meant to track the live 3D bounding box exactly. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[16%] right-[28%] bottom-[12%] left-[28%]"
        data-onboarding="cup-canvas"
      />
      <CupZoomControls
        controls={zoomControls}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-6"
        data-onboarding="zoom-controls"
      />
    </div>
  );
}
