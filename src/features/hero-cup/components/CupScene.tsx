"use client";

import { useEffect, useMemo } from "react";

import { CameraRig } from "@/engine/camera/CameraRig";
import type { CameraPresetName } from "@/engine/camera/presets";
import { DevPanelStatsCollector } from "@/engine/devpanel/DevPanel";
import { EffectsStack } from "@/engine/effects/EffectsStack";
import type { EnvironmentPresetName } from "@/engine/environment/presets";
import { resolveEnvironmentPreset } from "@/engine/environment/presets";
import { SceneEnvironment } from "@/engine/graphics/EnvironmentFactory";
import type { LightingPresetName } from "@/engine/lighting/presets";
import { resolveLightingPreset } from "@/engine/lighting/presets";
import { notifyThemeMaterialsUpdated } from "@/engine/materials";
import { performanceManager } from "@/engine/performance";
import { PerformanceSampler } from "@/engine/performance/PerformanceSampler";
import { resolveQualityPolicy } from "@/engine/performance/qualityPolicy";
import { useSmoothedValue } from "@/engine/performance/useSmoothedValue";
import type { SceneCompositionRoot } from "@/engine/scene/types";
import { publishLightingIntensity, publishQualityTier, publishTheme } from "@/engine/shaders/common";
import { ShaderDiagnosticsProbe } from "@/engine/shaders/DevDiagnosticsProbe";
import { brandAccentColor, creamColor, espressoColor } from "@/engine/theme/ColorSchemes";
import { useActiveTheme } from "@/engine/theme/ThemeEngine";
import { themeToPresetMap } from "@/engine/theme/LightingThemes";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

import { useMouseParallax } from "../hooks/useMouseParallax";
import type { CupPartName, CupPartProps, ResolvedIngredientLayer } from "../registry/types";
import { CupAssembly } from "./CupAssembly";

interface CupSceneProps {
  /** Sprint 3.2 — see `CupAssembly`'s doc comment; threaded straight through, this component has no opinion on what the overrides mean either. */
  partOverrides?: Partial<Record<CupPartName, CupPartProps>>;
  cupScale?: number;
  /** Sprint 3.3 — see `CupAssembly`'s doc comment; threaded straight through. */
  ingredientLayers?: ResolvedIngredientLayer[];
  /** Only affects the `SceneCompositionRoot` record, not rendering — defaults to `"/"` (the Hero route), matching prior behavior exactly when omitted. */
  route?: string;
  /** Sprint 3.5 — `features/concierge/` is this prop's first real caller (the "ai" preset, a real second-preset `CameraRig` switches to live). Defaults to `"hero"`, matching every prior route's unchanged behavior. */
  cameraPreset?: CameraPresetName;
  /**
   * Sprint 3.7 — `features/storytelling/` is this prop's first real
   * caller, switching lighting/environment per chapter instead of by
   * light/dark theme. Undefined for every prior route, so `themeToPresetMap`
   * still decides — byte-for-byte unchanged behavior when omitted.
   */
  lightingPresetOverride?: LightingPresetName;
  environmentPresetOverride?: EnvironmentPresetName;
}

export function CupScene({
  partOverrides,
  cupScale,
  ingredientLayers,
  route = "/",
  cameraPreset = "hero",
  lightingPresetOverride,
  environmentPresetOverride,
}: CupSceneProps) {
  const theme = useActiveTheme();
  const themeDefaults = themeToPresetMap[theme];
  const lightingPresetName = lightingPresetOverride ?? themeDefaults.lighting;
  const environment = environmentPresetOverride ?? themeDefaults.environment;
  const lightingPreset = resolveLightingPreset(lightingPresetName);
  const reducedMotion = usePrefersReducedMotion();
  const parallaxSource = useMouseParallax();
  const tier = performanceManager.tier.useValue();
  const qualityPolicy = resolveQualityPolicy(tier);

  // Batch signal for a future Debug Overlay/Analytics consumer — the
  // individual `material:created`/`material:updated` events already fire
  // per-material from the cache; this is the one-per-real-theme-change
  // summary, not a duplicate of those.
  useEffect(() => {
    notifyThemeMaterialsUpdated(theme);
  }, [theme]);

  // Sprint 3.8 fix: `uThemeMode`/`uColorTheme`/`uQualityTier` were typed in
  // the shared uniform block since Sprint 2.1/2.5 with real publisher
  // functions that had zero call sites anywhere — frozen at their
  // module-load defaults for every shader that might read them. `CupScene`
  // already computes `theme`/`tier` for its own DOM-facing needs; this is
  // the single scene-composition-root call site that publishes them for
  // any shader (present or future) that opts in, the same by-reference
  // convention `uStorytellingProgress` already established.
  useEffect(() => {
    publishTheme(theme, brandAccentColor(500));
  }, [theme]);

  useEffect(() => {
    publishQualityTier(tier);
  }, [tier]);

  // Sprint 2.5's Creative Budget item: bloom intensity — a plain float,
  // cheap to interpolate and the parameter most visibly affected by a tier
  // change — damps toward its tier-driven target instead of snapping.
  // Reduced motion skips the transition entirely (snap, per this project's
  // "disable outright, don't downgrade" policy) rather than animating it.
  const bloomTarget = qualityPolicy.bloomEnabled ? lightingPreset.bloom.intensity * qualityPolicy.bloomIntensityMultiplier : 0;
  // The hook's own useFrame subscription still runs under reduced motion
  // (cheap, and CameraRig's `enabled` prop is the actual place ambient
  // motion gets disabled) — its damped output is simply not read below,
  // so reduced-motion users see the target value directly, unsmoothed.
  const smoothedBloomIntensity = useSmoothedValue(bloomTarget, 6);
  const bloomIntensity = reducedMotion ? bloomTarget : smoothedBloomIntensity;

  // Sprint 3.7 — the same damped-toward-target technique as bloom above,
  // applied to ambient/directional intensity: `lightingPresetOverride`
  // switching per chapter now has something to blend *through* instead of
  // snapping instantly. Every pre-3.7 caller only ever changes
  // `lightingPresetName` on a theme toggle, where this was already the
  // exact existing (untested-as-such, but present) transition speed —
  // this doesn't change that route's feel, it just names and reuses it.
  const smoothedAmbientIntensity = useSmoothedValue(lightingPreset.ambient.intensity, 6);
  const smoothedDirectionalIntensity = useSmoothedValue(lightingPreset.directional.intensity, 6);
  const ambientIntensity = reducedMotion ? lightingPreset.ambient.intensity : smoothedAmbientIntensity;
  const directionalIntensity = reducedMotion ? lightingPreset.directional.intensity : smoothedDirectionalIntensity;

  // "the active lighting preset's directional intensity" — `uLightingIntensity`'s
  // own doc comment; publishes the same smoothed value the directional
  // light itself renders with, so a shader reading this stays in sync with
  // what's actually lighting the scene, not the pre-transition target.
  useEffect(() => {
    publishLightingIntensity(directionalIntensity);
  }, [directionalIntensity]);

  // Structurally checked against the frozen Scene Composition contract
  // (docs/22_MANAGER_INTERFACES.md) rather than left as ad hoc props — a
  // future route's composition root satisfies the same shape.
  const sceneConfig: SceneCompositionRoot = {
    route,
    camera: cameraPreset,
    environment,
    lighting: lightingPresetName,
    effects:
      qualityPolicy.bloomEnabled || bloomIntensity > 0
        ? [{ type: "bloom", intensity: bloomIntensity, threshold: lightingPreset.bloom.threshold }]
        : [],
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
      <ambientLight intensity={ambientIntensity} />
      <directionalLight
        position={lightingPreset.directional.position}
        intensity={directionalIntensity}
        castShadow
        shadow-mapSize={[qualityPolicy.shadowMapSize, qualityPolicy.shadowMapSize]}
      />
      <CupAssembly
        reducedMotion={reducedMotion}
        partOverrides={partOverrides}
        scale={cupScale}
        ingredientLayers={ingredientLayers}
      />
      <EffectsStack effects={sceneConfig.effects} />
      {/* Always mounted, including production — the session it protects
          most is exactly the struggling-device production session. See
          docs/14_PERFORMANCE_STRATEGY.md and PerformanceSampler.tsx. */}
      <PerformanceSampler />
      {/* Dev-only from here down — the DOM overlay these feed is already
          production-gated (DevPanel.tsx). */}
      {process.env.NODE_ENV !== "production" && <DevPanelStatsCollector preset={sceneConfig.camera} />}
      {process.env.NODE_ENV !== "production" && <ShaderDiagnosticsProbe />}
    </>
  );
}
