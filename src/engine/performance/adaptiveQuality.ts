import { appEvents } from "@/engine/events";

import { performanceManager } from "./index";
import { QUALITY_TIER_ORDER } from "./types";

/**
 * Adaptive Quality Manager — the real stepping algorithm deliberately
 * deferred since Sprint 2.1 ("building it now against an empty scene
 * would be unverifiable"). Now real, now verifiable against the actual
 * scene complexity Sprints 2.3/2.4 added.
 *
 * Asymmetric hysteresis, a deliberate evolution of
 * docs/14_PERFORMANCE_STRATEGY.md's original "never auto-step-up mid-
 * session" rule, not a silent reversal of it: stepping *down* stays fast
 * (3 consecutive low-FPS samples, ~1.5s at the existing 500ms cadence) to
 * protect the user quickly; stepping *up* requires a much longer sustained
 * recovery (10 consecutive high-FPS samples, ~5s) before it's trusted —
 * genuinely avoiding the visible thrashing the original rule was written
 * to prevent, while still allowing real recovery once conditions are
 * durably better. Combined with `qualityPolicy.ts`'s scale-not-disable
 * design and smooth parameter interpolation at the consuming call sites
 * (`CupScene.tsx`), a step in either direction reads as a graceful fade,
 * not a pop — this sprint's Creative Budget item.
 *
 * One step at a time, never skipping a tier in either direction — matches
 * `QUALITY_TIER_ORDER`'s ultra -> minimal ordering.
 */
const DOWNGRADE_FPS_THRESHOLD = 45;
const DOWNGRADE_CONSECUTIVE_SAMPLES = 3;
const UPGRADE_FPS_THRESHOLD = 55;
const UPGRADE_CONSECUTIVE_SAMPLES = 10;

let consecutiveLowSamples = 0;
let consecutiveHighSamples = 0;

function resetHysteresis(): void {
  consecutiveLowSamples = 0;
  consecutiveHighSamples = 0;
}

function stepTier(newIndex: number): void {
  const previous = performanceManager.tier.getValue();
  const next = QUALITY_TIER_ORDER[newIndex];
  if (!next || next === previous) return;

  performanceManager.tier.setValue(next);
  appEvents.emit({ name: "performance:tier-changed", tier: next, previous });
  appEvents.emit({ name: "quality:auto-changed", tier: next, previous });
}

/** Called once per FPS sample (the existing ~500ms cadence). A no-op in `"manual"` mode. */
export function evaluateAdaptiveQuality(fps: number): void {
  if (performanceManager.mode.getValue() !== "automatic") {
    resetHysteresis();
    return;
  }

  const currentTier = performanceManager.tier.getValue();
  const currentIndex = QUALITY_TIER_ORDER.indexOf(currentTier);

  if (fps < DOWNGRADE_FPS_THRESHOLD) {
    consecutiveLowSamples += 1;
    consecutiveHighSamples = 0;

    if (consecutiveLowSamples === 1) {
      appEvents.emit({ name: "performance:degraded", fps });
    }

    if (consecutiveLowSamples >= DOWNGRADE_CONSECUTIVE_SAMPLES && currentIndex < QUALITY_TIER_ORDER.length - 1) {
      stepTier(currentIndex + 1);
      consecutiveLowSamples = 0;
    }
    return;
  }

  if (fps >= UPGRADE_FPS_THRESHOLD) {
    consecutiveHighSamples += 1;
    consecutiveLowSamples = 0;

    if (consecutiveHighSamples >= UPGRADE_CONSECUTIVE_SAMPLES && currentIndex > 0) {
      stepTier(currentIndex - 1);
      appEvents.emit({ name: "performance:recovered", fps });
      consecutiveHighSamples = 0;
    }
    return;
  }

  // Between the two thresholds — a stable-enough reading resets both
  // counters rather than letting a borderline sample count toward either
  // direction's streak.
  resetHysteresis();
}
