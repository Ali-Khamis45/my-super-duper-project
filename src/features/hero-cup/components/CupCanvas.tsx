"use client";

import type { RootState } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { AnimatePresence, motion } from "framer-motion";
import { Suspense, useCallback, useEffect } from "react";

import { track } from "@/engine/analytics/tracking";
import { initTexturePipeline } from "@/engine/assets/textures";
import { resolveCameraPreset } from "@/engine/camera/presets";
import type { CameraPresetName } from "@/engine/camera/presets";
import { fadeIn } from "@/engine/motion/presets";
import { performanceManager } from "@/engine/performance";
import { resolveQualityPolicy } from "@/engine/performance/qualityPolicy";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

import { useCupKeyboardTrigger } from "../hooks/useCupKeyboardControls";
import { useWebGLContextRecovery } from "../hooks/useWebGLContextRecovery";
import { useWebGLSupport } from "../hooks/useWebGLSupport";
import type { CupPartName, CupPartProps, ResolvedIngredientLayer } from "../registry/types";
import { CupScene } from "./CupScene";
import { CupStaticFallback } from "./CupStaticFallback";

interface CupCanvasProps {
  /** Sprint 3.2 — threaded straight through to `CupScene`/`CupAssembly`. `undefined` for the Hero route (the only caller before this sprint), so its rendering is byte-for-byte unchanged. */
  partOverrides?: Partial<Record<CupPartName, CupPartProps>>;
  cupScale?: number;
  /** Sprint 3.3 — threaded straight through. */
  ingredientLayers?: ResolvedIngredientLayer[];
  route?: string;
  /** Sprint 3.5 — threaded straight through to `CupScene`; also seeds this `<Canvas>`'s *initial* camera prop below (`CameraRig` only takes over smoothing *after* first mount — see its own "first mount only: snap instantly" comment). Defaults to `"hero"`, matching every prior route's unchanged behavior. */
  cameraPreset?: CameraPresetName;
}

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
export default function CupCanvas({ partOverrides, cupScale, ingredientLayers, route, cameraPreset = "hero" }: CupCanvasProps = {}) {
  // Read once per mount (the prop won't change after mount for any current
  // caller), not re-resolved every render — `resolveCameraPreset` always
  // returns the same object reference for a given name anyway.
  const initialCameraPreset = resolveCameraPreset(cameraPreset);
  const webglSupported = useWebGLSupport();
  const reducedMotion = usePrefersReducedMotion();
  const { contextLost, handleCreated } = useWebGLContextRecovery();
  // Drag-to-rotate has no keyboard equivalent otherwise. Focusing this
  // region and pressing Left/Right rotates the cup the same way a drag does.
  const { onKeyDown } = useCupKeyboardTrigger();
  // Reactive (not `.getValue()`) — a tier change must re-render the
  // Canvas with a new `dpr` prop; DPR is a render-target resolution
  // change, not something that can be smoothed continuously (see
  // `useSmoothedValue.ts`'s doc comment on which parameters can and can't be).
  const tier = performanceManager.tier.useValue();
  const dprRange = resolveQualityPolicy(tier).dprRange;

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
      {/* Sprint 2.6 Creative Budget: the fallback used to pop in/out
          instantly on a real WebGL context loss/restore — jarring for a
          failure mode that's already disorienting on its own. Reuses the
          existing `fadeIn` preset (Milestone 1) rather than inventing a
          second motion vocabulary; reduced motion snaps instead of
          animating, this project's established "disable outright, don't
          downgrade" policy, not a new carve-out for this one case. */}
      <AnimatePresence>
        {contextLost && (
          <motion.div
            className="absolute inset-0 z-10"
            initial={reducedMotion ? false : "hidden"}
            animate="visible"
            exit={reducedMotion ? undefined : "hidden"}
            variants={fadeIn}
          >
            <CupStaticFallback />
          </motion.div>
        )}
      </AnimatePresence>
      <Canvas
        shadows
        dpr={dprRange}
        camera={{ position: initialCameraPreset.position, fov: initialCameraPreset.fov }}
        frameloop={reducedMotion ? "demand" : "always"}
        className={`focus-visible:ring-ring h-full w-full rounded-lg focus-visible:ring-2 focus-visible:outline-none ${contextLost ? "invisible" : ""}`}
        tabIndex={contextLost ? -1 : 0}
        role="application"
        aria-label="Interactive 3D coffee cup. Use the Left and Right arrow keys to rotate it."
        onKeyDown={onKeyDown}
        onCreated={onCreated}
      >
        <Suspense fallback={null}>
          <CupScene
            partOverrides={partOverrides}
            cupScale={cupScale}
            ingredientLayers={ingredientLayers}
            route={route}
            cameraPreset={cameraPreset}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
