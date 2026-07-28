import { appEvents } from "@/engine/events";

import { track } from "./tracking";

/**
 * Analytics subscribes to the EventBus rather than features calling
 * `track()` directly — the two are never the same mechanism (see
 * docs/18_ENGINEERING_CONTRACTS.md's Review section). Imported once, for
 * its module-scope subscription side effect, by whichever feature code
 * first emits `cup:rotated` (`useCupInteractionState`).
 */
appEvents.on("cup:rotated", (event) => {
  track({ name: "hero_cup_rotated", payload: { method: event.method } });
});

/**
 * Production Telemetry Hooks (docs/16_ENGINEERING_SPRINTS.md Sprint 2.5) —
 * real, wired, using the same sink-swap seam every other analytics event
 * already uses (docs/01_ARCHITECTURE.md: console.debug in dev, a real
 * provider swapped in later, every call site unchanged either way). Fires
 * on state *transitions*, never on every ~500ms performance sample — a
 * flood of telemetry events on a healthy, unchanging session would be
 * noise, not signal.
 */
appEvents.on("quality:auto-changed", (event) => {
  track({ name: "quality_tier_auto_changed", payload: { tier: event.tier, previous: event.previous } });
});

appEvents.on("performance:degraded", (event) => {
  track({ name: "performance_degraded", payload: { fps: event.fps } });
});

appEvents.on("memory:pressure", (event) => {
  track({ name: "memory_pressure_detected", payload: { reason: event.reason } });
});
