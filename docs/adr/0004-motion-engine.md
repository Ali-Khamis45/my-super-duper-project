# ADR-0004 — A unified motion engine over ad hoc per-component animation

**Status**: Accepted

## Context

The project uses three motion tools for different jobs: Framer Motion (declarative React component transitions), GSAP (scroll-driven/timeline sequencing, arriving in force at Milestone 6), and raw R3F `useFrame` (per-frame 3D object animation). Left ungoverned, each component would invent its own durations/easings/thresholds, causing visible inconsistency (a 200ms ease-out button next to a 400ms linear card) and duplicated magic numbers — directly against the "no duplicated values" rule in [06_CODING_STANDARDS.md](../06_CODING_STANDARDS.md).

## Decision

A single `engine/motion/` module is the source of truth for timing: `easings.ts`/`durations.ts`/`springs.ts` hold the raw curves, `presets.ts` exposes named, reusable Framer Motion variants (`fadeIn`, `fadeUp`, `pop`, `magnetic`, `float`, `stagger`, `parallax`, `tilt`) built from those primitives, and `gestures.ts` normalizes pointer input shared by both 2D (magnetic/tilt) and 3D (drag-rotate) interactions. GSAP timelines (from Milestone 6 onward) and R3F `useFrame` animation consume the same `easings.ts`/`durations.ts` values rather than restating them.

## Consequences

Gains: consistent motion feel across DOM and 3D, one place to implement the reduced-motion policy instead of N places, one place to tune "does this feel premium" during Creative Director Review. Costs: a component author must reach for an existing preset/token before inventing a new curve — mild friction, intentional, prevents drift.
