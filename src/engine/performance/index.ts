import { createBridgeStore } from "@/engine/state/createBridgeStore";

import type { QualityTier } from "./types";

/**
 * Foundation only this sprint — see docs/16_ENGINEERING_SPRINTS.md Sprint
 * 2.5 and docs/26_API_STABILITY.md. `tier` exists and is readable by any
 * future quality-sensitive consumer now; the adaptive stepping algorithm
 * (sustained-low-FPS detection, step-down-never-auto-step-up hysteresis)
 * is real logic that belongs in Sprint 2.5, once there's enough scene
 * complexity (the steam shader) for a meaningful budget to test against —
 * building it now against an empty scene would be exactly the kind of
 * premature/unverifiable code this project's standards reject.
 *
 * One-directionality rule (docs/15_ARCHITECTURE_FREEZE.md): this module
 * never imports Effect/Shader/Material Managers. Every quality-sensitive
 * system reads `tier` — this module never reaches into them.
 */
const tier = createBridgeStore<QualityTier>("high");
const lastFps = createBridgeStore(0);

/** Called by the FPS sampler each sample. Records the reading; does not yet act on it — see above. */
function sampleFrame(fps: number): void {
  lastFps.setValue(fps);
}

export const performanceManager = {
  tier,
  lastFps,
  sampleFrame,
};
