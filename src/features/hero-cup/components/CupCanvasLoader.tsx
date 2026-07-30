"use client";

import dynamic from "next/dynamic";

import type { CameraPresetName } from "@/engine/camera/presets";
import type { EnvironmentPresetName } from "@/engine/environment/presets";
import type { LightingPresetName } from "@/engine/lighting/presets";
import type { BridgeStore } from "@/engine/state/createBridgeStore";

import type { CupPartName, CupPartProps, ResolvedIngredientLayer } from "../registry/types";
import { CupStaticFallback } from "./CupStaticFallback";

// `ssr: false` is only permitted inside a Client Component in Next.js 16 —
// this thin wrapper exists so Hero.tsx can stay a Server Component while
// still keeping `three`/R3F out of the server bundle entirely.
const CupCanvas = dynamic(() => import("./CupCanvas"), {
  ssr: false,
  loading: () => <CupStaticFallback />,
});

interface CupCanvasLoaderProps {
  /** Sprint 3.2 — `features/customizer/` is this prop's first real caller; the Hero route passes nothing, unchanged. */
  partOverrides?: Partial<Record<CupPartName, CupPartProps>>;
  cupScale?: number;
  /** Sprint 3.3 — `features/composer/` is this prop's first real caller. */
  ingredientLayers?: ResolvedIngredientLayer[];
  route?: string;
  /** Sprint 3.5 — `features/concierge/` is this prop's first real caller. */
  cameraPreset?: CameraPresetName;
  /** Sprint 3.7 — `features/storytelling/` is this prop pair's first real caller. */
  lightingPresetOverride?: LightingPresetName;
  environmentPresetOverride?: EnvironmentPresetName;
  /** Sprint 3.9 — threaded straight through to `CupCanvas`. */
  zoomSource?: BridgeStore<number>;
}

export function CupCanvasLoader({
  partOverrides,
  cupScale,
  ingredientLayers,
  route,
  cameraPreset,
  lightingPresetOverride,
  environmentPresetOverride,
  zoomSource,
}: CupCanvasLoaderProps = {}) {
  return (
    <CupCanvas
      partOverrides={partOverrides}
      cupScale={cupScale}
      ingredientLayers={ingredientLayers}
      route={route}
      cameraPreset={cameraPreset}
      lightingPresetOverride={lightingPresetOverride}
      environmentPresetOverride={environmentPresetOverride}
      zoomSource={zoomSource}
    />
  );
}
