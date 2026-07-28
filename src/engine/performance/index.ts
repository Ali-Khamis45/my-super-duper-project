import { createBridgeStore } from "@/engine/state/createBridgeStore";

import type { QualityMode, QualityTier } from "./types";

/**
 * `tier`/`mode` — one-directionality rule (docs/15_ARCHITECTURE_FREEZE.md):
 * this module never imports Effect/Shader/Material Managers. Every
 * quality-sensitive system reads `tier` — this module never reaches into
 * them. `mode` governs whether `engine/performance/adaptiveQuality.ts` is
 * allowed to change `tier` on its own (`"automatic"`, the default) or a
 * pinned tier stays fixed regardless of measurements (`"manual"` — dev
 * testing, a future user-facing toggle).
 */
const tier = createBridgeStore<QualityTier>("high");
const mode = createBridgeStore<QualityMode>("automatic");
const lastFps = createBridgeStore(0);

/** Called by the FPS sampler each sample. Records the reading and feeds the Adaptive Quality Manager's evaluation. */
function sampleFrame(fps: number): void {
  lastFps.setValue(fps);
}

export const performanceManager = {
  tier,
  mode,
  lastFps,
  sampleFrame,
};
