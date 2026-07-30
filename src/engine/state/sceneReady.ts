import { createBridgeStore } from "./createBridgeStore";

/**
 * Sprint 3.9 — whether the active `CupScene` has rendered at least one real
 * frame. `scene:ready` (`engine/events/types.ts`) has been typed since
 * Sprint 0 with zero real emitters (the same "typed, never wired" pattern
 * Sprint 3.8's audit found for several shader uniforms) — this is that
 * event's first real publisher, and this bridge store is the DOM-facing
 * half of the same signal: `CupScene` sets it exactly once, on its first
 * rendered `useFrame` tick; `CupCanvas` reflects it as a `data-scene-ready`
 * attribute a test (or any other DOM-side consumer) can wait on. Found a
 * real need for this during Sprint 3.9's own e2e verification: a fixed
 * `waitForTimeout` before a visual-regression screenshot is not a reliable
 * proxy for "the canvas has actually painted" — shader-compile timing
 * genuinely varies run to run, and a "camera settled" heuristic can't tell
 * the difference between "nothing has rendered yet" and "rendered and
 * stable."
 */
export const sceneReady = createBridgeStore<boolean>(false);
