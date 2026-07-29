import { createBridgeStore } from "./createBridgeStore";

/**
 * `0-1` global scroll progress through the `/story` route's scrollable
 * track, written from `ScrollTrigger.onUpdate` (see
 * `features/storytelling/hooks/useScrollTimeline.ts`), read reactively by
 * DOM narrative components (`useValue`) and imperatively by non-React
 * consumers like a `useFrame` callback (`getValue`) — the exact shape
 * `docs/18_ENGINEERING_CONTRACTS.md`'s pre-designed contract sketched back
 * in Sprint 2.1, this sprint's first real consumer. `createBridgeStore`
 * itself is untouched — this is an instantiation, not an extension.
 *
 * Deliberately NOT read by `engine/camera/CameraRig.tsx` directly — Sprint
 * 3.7's brief is explicit ("Do not modify Camera contracts. Implement
 * through new presets only"), a real, reasoned deviation from what this
 * contract doc anticipated when it was written (pre-implementation, before
 * this sprint's actual brief existed). `features/storytelling/` reads this
 * store itself and drives `CameraRig` only through its existing, unchanged
 * `preset` prop — see that feature's README.
 */
export const scrollProgress = createBridgeStore<number>(0);
