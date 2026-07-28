# ADR-0007 — Animation ownership split: Framer Motion / raw `useFrame` / GSAP, bridged by a generalized store

**Status**: Accepted

## Context

Three animation tools coexist in the dependency tree: Framer Motion (used, DOM), raw R3F `useFrame` (used, 3D), GSAP (installed since the project scaffold, unused). Scroll Storytelling (Milestone 6) needs coordinated, multi-step, scroll-driven sequencing across both DOM text and a 3D camera — a job none of the three tools alone is positioned to own without either fighting the other two or reinventing timeline sequencing by hand.

## Decision

Assign ownership by animation *shape*, not by preference: Framer Motion owns discrete, component-scoped DOM entrances/gestures (unchanged from Milestone 1); raw `useFrame` owns continuous 3D transforms where the state *is* the frame-by-frame value (idle float, inertia, future liquid physics); GSAP + `ScrollTrigger` owns multi-step, scroll/narrative-triggered sequencing, finally exercised starting Milestone 6. The three are bridged where needed — not merged into one system — by generalizing a pattern Milestone 1 already used three times independently (a value written outside React's render cycle, read imperatively by a 3D consumer and reactively by a DOM consumer) into one reusable `createBridgeStore<T>()` utility (see [04_MOTION_ENGINE.md](../04_MOTION_ENGINE.md)).

## Consequences

Gains: no animation tool is asked to do a job it's not suited for (no hand-rolled scroll-timeline sequencing via `useFrame`, no reinventing per-frame 3D transform ownership in GSAP); the bridge-store pattern being *named and reusable* means the next cross-boundary signal (and there will be one) doesn't get invented a fourth time. Costs: three tools active in the same codebase is more surface area than one — justified because each is genuinely the better fit for a different job already on the confirmed roadmap, not spread thin across hypothetical future needs. Lenis + GSAP `ScrollTrigger` requires explicit raf-loop unification (documented in [04_MOTION_ENGINE.md](../04_MOTION_ENGINE.md)) to avoid desync — a known integration cost, accepted and documented rather than discovered live.
