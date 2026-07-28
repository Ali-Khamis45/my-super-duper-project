"use client";

import type { RootState } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect } from "react";

import { track } from "@/engine/analytics/tracking";
import { initTexturePipeline } from "@/engine/assets/textures";
import { resolveCameraPreset } from "@/engine/camera/presets";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

import { useCupKeyboardTrigger } from "../hooks/useCupKeyboardControls";
import { useWebGLContextRecovery } from "../hooks/useWebGLContextRecovery";
import { useWebGLSupport } from "../hooks/useWebGLSupport";
import { CupScene } from "./CupScene";
import { CupStaticFallback } from "./CupStaticFallback";

// Read once at module scope, not per-render — resolveCameraPreset always
// returns the same object reference for a given name anyway.
const heroCameraPreset = resolveCameraPreset("hero");

/**
 * The ssr:false-dynamic-imported entry point — everything `three`/R3F lives
 * downstream of here, never in the server bundle. Routes to a real static
 * fallback (not a spinner) when WebGL is unavailable at load.
 *
 * If the GPU context is lost mid-session (a driver crash, another tab's GPU
 * load — distinct from "unavailable at load", see docs/03_3D_ENGINE.md's
 * Robustness section), the Canvas stays mounted rather than being torn
 * down: `webglcontextrestored` only fires on the *same* canvas element that
 * lost it, so unmounting would make recovery undetectable. The fallback is
 * layered on top instead, and the (invisible, still-listening) Canvas
 * underneath is what lets a real restoration actually be caught.
 */
export default function CupCanvas() {
  const webglSupported = useWebGLSupport();
  const reducedMotion = usePrefersReducedMotion();
  const { contextLost, handleCreated } = useWebGLContextRecovery();
  // Drag-to-rotate has no keyboard equivalent otherwise. Focusing this
  // region and pressing Left/Right rotates the cup the same way a drag does.
  const { onKeyDown } = useCupKeyboardTrigger();

  const onCreated = useCallback(
    (state: RootState) => {
      handleCreated(state);
      initTexturePipeline(state.gl);
    },
    [handleCreated],
  );

  useEffect(() => {
    if (!webglSupported) {
      track({ name: "webgl_unavailable", payload: {} });
    }
  }, [webglSupported]);

  if (!webglSupported) {
    return <CupStaticFallback />;
  }

  return (
    <div className="relative h-full w-full">
      {contextLost && (
        <div className="absolute inset-0 z-10">
          <CupStaticFallback />
        </div>
      )}
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: heroCameraPreset.position, fov: heroCameraPreset.fov }}
        frameloop={reducedMotion ? "demand" : "always"}
        className={`focus-visible:ring-ring h-full w-full rounded-lg focus-visible:ring-2 focus-visible:outline-none ${contextLost ? "invisible" : ""}`}
        tabIndex={contextLost ? -1 : 0}
        role="application"
        aria-label="Interactive 3D coffee cup. Use the Left and Right arrow keys to rotate it."
        onKeyDown={onKeyDown}
        onCreated={onCreated}
      >
        <Suspense fallback={null}>
          <CupScene />
        </Suspense>
      </Canvas>
    </div>
  );
}
