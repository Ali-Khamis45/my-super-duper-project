import { createBridgeStore } from "@/engine/state/createBridgeStore";

/**
 * "Cup flies smoothly into cart" needs a real target position to animate
 * toward — the navbar's cart icon, which lives in a completely different
 * part of the component tree than the "Add to Cart" button that triggers
 * the animation. The same cross-tree-boundary problem
 * `hero-cup/hooks/useCupKeyboardControls.ts`'s `keyboardRotationDelta`
 * solves with `engine/state/createBridgeStore.ts` — reused here for a
 * DOM-position handoff instead of a keyboard-rotation delta, the same
 * generic factory, a new feature-owned instance.
 */
export const cartIconAnchor = createBridgeStore<HTMLElement | null>(null);
