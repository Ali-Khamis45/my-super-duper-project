# ADR-0002 — React Three Fiber with a swappable-part registry

**Status**: Accepted

## Context

The spec requires a coffee cup made of independently customizable parts (cup/lid/sleeve/coffee/foam/steam/logo/shadow), built procedurally today but intended to be replaced by real modeled GLB assets across future milestones without a rewrite. Alternatives considered: raw Three.js (loses React's declarative composition and R3F/drei's ecosystem of HDRI/postprocessing/decal helpers), a single monolithic cup component (fails the "independently customizable/swappable part" requirement outright), baking the cup as a 2D/video asset (explicitly rejected by the spec — it must be a live, interactive 3D object).

## Decision

Use `@react-three/fiber` + `@react-three/drei` + `@react-three/postprocessing`. Every cup part implements a shared `CupPartProps` interface and is resolved through a `cupPartRegistry` keyed by `(partName, implementation)`, defaulting to `procedural`. `CupAssembly` depends only on the interface, never a concrete part. The same registry pattern is reused for camera presets and post-processing effects (see [01_ARCHITECTURE.md](../01_ARCHITECTURE.md)).

## Consequences

Gains: a future `ModelCup` (GLB-backed) drops in as one registry entry with zero changes to `CupAssembly`, `CupScene`, or any hook; procedural geometry today is genuinely production-shaped, not throwaway. Costs: the contract/registry indirection is more ceremony than a single hardcoded component would need for a one-off cup — justified here because the spec confirms this cup's parts *will* individually evolve (real assets, physics, shader steam) across many future milestones, not a hypothetical.
