# 12 — Interaction System

**Implemented, Sprint 2.1** — `engine/interaction/types.ts` and `useGestureRecognizer.ts` exist and are tested exactly as designed below. One real finding from implementation, not anticipated when this doc was first written: `useCupInteractionState` does **not** consume `useGestureRecognizer` — the cup is hit-tested by R3F's raycaster on a `<group>` (`ThreeEvent` handlers), not a DOM element, so `useGestureRecognizer`'s `RefObject<HTMLElement>` shape doesn't fit 3D hit-testing. The cup keeps its own proven pointer mechanics but now speaks the same `GestureType`/`PointerKind` vocabulary and emits the same `interaction:started`/`-ended` events — see [03_3D_ENGINE.md](03_3D_ENGINE.md) and this sprint's retrospective ([reviews/sprint-2.1-review.md](reviews/sprint-2.1-review.md)) for the full reasoning. `useGestureRecognizer` remains real, tested infrastructure for the next genuinely DOM-native interactive object.

## The motivating case study

The cup's drag-to-rotate had **zero keyboard equivalent** through most of Milestone 1 — a keyboard-only user could see the cup (ambient auto-rotate still played) but never control it. The fix (arrow-key rotation, a small bridge store draining into the same `rotationYRef` a drag already writes to) worked, but it was built as a one-off, bolted onto `useCupInteractionState` after the fact. The Interaction Manager exists so the *next* interactive object never repeats that gap — every gesture the manager recognizes ships with its keyboard equivalent from the start, not discovered missing in a later review.

## Device unification — less new work than it sounds like

Mouse, touch, and stylus/pen already arrive through **one** browser API — Pointer Events (`pointerdown`/`pointermove`/`pointerup`, with `event.pointerType` telling you which). `useCupInteractionState` already reads `pointerType` to distinguish `"touch"` from mouse-drag for analytics. Unifying these three isn't building three separate input paths and merging them — it's making sure every interactive object goes through pointer events (never a legacy `touchstart`/`mousedown` split) and makes *deliberate* `pointerType`-based decisions only where behavior should actually differ (e.g., a larger drag-start threshold on touch, so a vertical swipe intended as page scroll doesn't get mistaken for an object-rotate gesture).

Keyboard and (future) gamepad are genuinely different APIs and get their own recognizers, feeding the same downstream gesture vocabulary.

## Architecture: recognize, then respond — as two separate steps

`useCupInteractionState` today does both in one hook: it recognizes a drag (via `pointermove` deltas) *and* decides what a drag does (rotate `rotationYRef`). That fusion is fine for a single interactive object; it doesn't scale to a second one. The Interaction Manager splits it:

```ts
// engine/interaction/types.ts
export type GestureType = "tap" | "drag-start" | "drag-move" | "drag-end" | "hover-start" | "hover-end" | "press-hold";
export type PointerKind = "mouse" | "touch" | "pen" | "keyboard" | "gamepad";

export interface GestureEvent {
  type: GestureType;
  pointerKind: PointerKind;
  /** Normalized [-1, 1], via the existing normalizePointer from engine/motion/gestures.ts. */
  position: { x: number; y: number };
  /** Present on drag-move; raw pixel delta since the last event. */
  delta?: { x: number; y: number };
  /** Present for pen input when the browser reports it; unused today, available for a future
      pressure-sensitive interaction — not built until something actually needs it. */
  pressure?: number;
}
```

```ts
// engine/interaction/useGestureRecognizer.ts
export function useGestureRecognizer(
  targetRef: RefObject<HTMLElement>,
  handlers: Partial<Record<GestureType, (event: GestureEvent) => void>>,
) { /* attaches Pointer Event listeners, normalizes, dispatches typed GestureEvents */ }
```

`useCupInteractionState` becomes a *consumer* of `useGestureRecognizer` — it subscribes to `"drag-move"` and applies the delta to `rotationYRef`, exactly as today, but the recognition machinery is no longer private to the cup. A future ingredient-drag interaction (Milestone 5) subscribes to the exact same `"drag-start"`/`"drag-move"`/`"drag-end"` events and does something completely different with them (moving an ingredient toward the cup, not rotating it) — same recognizer, different response, which is the entire point of separating the two.

## Keyboard

Every gesture that has a spatial/continuous pointer equivalent gets a discrete keyboard equivalent by construction, not as an afterthought — the cup's Left/Right-arrow rotation is the reference implementation to replicate: a focusable, labeled target (`tabIndex`, `role`, `aria-label` describing what the keys do) and a small bridge store (see [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md)'s `createBridgeStore`) draining a discrete nudge into whatever continuous value the pointer gesture also writes to.

## Gamepad (future, unbuilt, shape only)

Nothing on the current roadmap needs gamepad support — this section exists so that *if* it's ever added, it plugs into the same `GestureEvent` vocabulary instead of inventing a parallel system. The Gamepad API is poll-based, not event-based (`navigator.getGamepads()`, read inside a `requestAnimationFrame` loop, not a listener) — a `useGamepadPoll()` hook would translate stick/button state into the same `GestureEvent` shape (`pointerKind: "gamepad"`) at recognizer-emission time, so every downstream consumer (`useCupInteractionState` and anything built after it) stays unaware of which physical device produced the gesture.

## Accessibility and reduced motion, as inputs to the manager, not bolted on

- Every recognized gesture that triggers *automatic* follow-on animation (not the gesture's own direct-manipulation response) checks `usePrefersReducedMotion` before animating — unchanged policy from [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md), just now enforced at the recognizer/response boundary consistently instead of per-hook.
- Touch targets stay at or above the existing 32px (`size-8`) minimum already in use for icon buttons — meets WCAG 2.5.8's 24×24 AA floor; nothing here proposes shrinking it further as new interactive objects are added.
- Focus management: any newly-focusable interactive region (a future ingredient, a future customizer control) follows the cup's precedent — visible focus ring (contrast-verified against the actual token values, not assumed — see the Milestone 1 stabilization review's real WCAG fix), sensible tab order, `Escape`/blur behavior where a mode is entered (matches Base UI's existing Sheet/Dialog conventions already in use elsewhere in the app).

## Related

[03_3D_ENGINE.md](03_3D_ENGINE.md) · [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md) · [state-machine.md](state-machine.md) · [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) · [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md) · [reviews/milestone-1-stabilization-review.md](reviews/milestone-1-stabilization-review.md)
