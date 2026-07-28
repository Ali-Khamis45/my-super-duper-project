"use client";

import { useEffect, useMemo } from "react";

import { CameraRig } from "@/engine/camera/CameraRig";
import { DevPanelStatsCollector } from "@/engine/devpanel/DevPanel";
import { EffectsStack } from "@/engine/effects/EffectsStack";
import { resolveEnvironmentPreset } from "@/engine/environment/presets";
import { SceneEnvironment } from "@/engine/graphics/EnvironmentFactory";
import { resolveLightingPreset } from "@/engine/lighting/presets";
import { notifyThemeMaterialsUpdated } from "@/engine/materials";
import type { SceneCompositionRoot } from "@/engine/scene/types";
import { creamColor, espressoColor } from "@/engine/theme/ColorSchemes";
import { useActiveTheme } from "@/engine/theme/ThemeEngine";
import { themeToPresetMap } from "@/engine/theme/LightingThemes";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

import { useMouseParallax } from "../hooks/useMouseParallax";
import { CupAssembly } from "./CupAssembly";

export function CupScene() {
  const theme = useActiveTheme();
  const { environment, lighting: lightingPresetName } = themeToPresetMap[theme];
  const lightingPreset = resolveLightingPreset(lightingPresetName);
  const reducedMotion = usePrefersReducedMotion();
  const parallaxSource = useMouseParallax();

  // Batch signal for a future Debug Overlay/Analytics consumer — the
  // individual `material:created`/`material:updated` events already fire
  // per-material from the cache; this is the one-per-real-theme-change
  // summary, not a duplicate of those.
  useEffect(() => {
    notifyThemeMaterialsUpdated(theme);
  }, [theme]);

  // Structurally checked against the frozen Scene Composition contract
  // (docs/22_MANAGER_INTERFACES.md) rather than left as ad hoc props — a
  // future route's composition root satisfies the same shape.
  const sceneConfig: SceneCompositionRoot = {
    route: "/",
    camera: "hero",
    environment,
    lighting: lightingPresetName,
    effects: [{ type: "bloom", intensity: lightingPreset.bloom.intensity, threshold: lightingPreset.bloom.threshold }],
  };
  const environmentPreset = resolveEnvironmentPreset(sceneConfig.environment);

  // Matches --background exactly (creamColor(50) / espressoColor(900)) so the
  // canvas never shows a mismatched default clear color behind the cup.
  const backgroundColor = useMemo(
    () => (theme === "dark" ? espressoColor(900) : creamColor(50)),
    [theme],
  );

  return (
    <>
      <color attach="background" args={[backgroundColor]} />
      <CameraRig
        preset={sceneConfig.camera}
        parallaxSource={parallaxSource}
        parallaxStrength={0.35}
        enabled={!reducedMotion}
      />
      <SceneEnvironment preset={environmentPreset} />
      <ambientLight intensity={lightingPreset.ambient.intensity} />
      <directionalLight
        position={lightingPreset.directional.position}
        intensity={lightingPreset.directional.intensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <CupAssembly reducedMotion={reducedMotion} />
      <EffectsStack effects={sceneConfig.effects} />
      {/* Never in production — the DOM overlay it feeds is already
          production-gated (DevPanel.tsx); this useFrame loop shouldn't run
          in a build no one can see the output of either. */}
      {process.env.NODE_ENV !== "production" && <DevPanelStatsCollector preset={sceneConfig.camera} />}
    </>
  );
}
