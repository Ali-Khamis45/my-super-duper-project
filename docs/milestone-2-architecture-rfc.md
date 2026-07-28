# Milestone 2 — Engine Architecture RFC

**Status**: Design complete, pending approval. **No implementation has started** — this document and the ones it links to are the entire deliverable of this phase.

**Purpose**: design the 3D/motion engine so that everything the full 24-phase roadmap needs — real GLB assets, procedural assets, live customization, an ingredient system, steam shaders, coffee liquid physics, scroll storytelling, an AI barista, commerce, and future plugins — is reachable by *populating registries and adding implementations*, never by restructuring the engine layer itself. This doc is Task 1 (the critique that motivates everything else) plus an index into the detailed design docs (Tasks 2–8) and the roadmap (Task 10).

## The central thesis

Milestone 1 already proved a pattern three times over — cup parts, camera presets, post-processing effects all use the same `name × implementation` registry, where the *interface* is fully typed up front (including names for things that don't exist yet, like `CameraPresetName`'s `"product" | "checkout" | "ai"`) and *implementations* are added one registry entry at a time, per milestone, with zero changes to the code that consumes the registry.

**This is the mechanism, not a nice side effect.** "Support X without architectural changes" and "no half-finished code" (docs/06_CODING_STANDARDS.md) look like they're in tension — build everything now vs. build nothing before it's needed — and the registry pattern is exactly what resolves that tension: it lets us finalize *contracts* comprehensively now while *implementations* still arrive incrementally, exactly like Milestone 1's camera presets already do for `"product"`. Every manager designed below is a generalization of that same idea, applied to a system that currently doesn't have it yet.

## Task 1 — Current state, system by system

What exists today (`src/engine/`), what's missing, and why the gap will block a specific named future milestone if left alone.

| System | Today | Gap | Blocks |
|---|---|---|---|
| **Scene graph** | `cupPartRegistry` — a registry, but hardcoded to `CupPartName`/`CupPartProps`, specific to one feature | No reusable, generic version of the pattern; a second feature (ingredients, a product model) would either copy-paste the shape or bloat the cup's types | Ingredient system, Customizer, AI Barista's own scene |
| **Scene manager** | None — `CupCanvas` renders exactly one hardcoded `<CupScene>` | No way to mount/transition between named scenes in one persistent `<Canvas>` (or a deliberate decision to use separate Canvases per route) | Customizer, Checkout, AI Barista |
| **Camera manager** | `CameraRig` snaps to one preset on mount, then damps toward that *same* preset + a parallax offset, forever | No preset-to-preset transition, no progress-driven path interpolation | Scroll Storytelling (camera paths), any route change |
| **Environment / lighting manager** | Fused into `LightingThemes` — light/dark UI theme is the *only* axis | Day/night, per-scene environments, and seasonal/promotional lighting all need an axis independent of UI theme | Steam & Lighting Depth (Milestone 2 itself), Scroll Storytelling |
| **Material manager** | 5 factory *functions* in `MaterialFactory.ts`, each called ad hoc, a new instance every call, no cache | No sharing/pooling, no disposal lifecycle beyond "whatever R3F does automatically," no data-driven material "recipes" | Customizer (live, repeated material swaps) |
| **Texture manager** | `TextureLoader.ts` generates 2 canvas textures at runtime; no caching, no KTX2 | No compressed-texture pipeline, no reuse if the same texture is requested twice | Real GLB assets, Ingredient system |
| **Asset manager** | Doesn't exist. `useGLTF` is referenced in docs, never wired | No shared GLTFLoader/DRACOLoader/KTX2Loader setup, no manifest, no preload orchestration, no fallback-on-failure | Real GLB assets (the actual asset-pipeline milestone) |
| **Interaction manager** | Split across `useCupInteractionState` (cup-specific), `useMouseParallax` (cup-specific), `engine/motion/gestures` (generic 2D) | No device abstraction (mouse/touch/stylus/gamepad), no separation between "what gesture happened" and "what it does" | Ingredient drag-and-drop, future gamepad support |
| **Animation manager** | Three uncoordinated systems: Framer Motion (DOM), raw `useFrame` (3D, hand-rolled per component), GSAP (installed, zero usage) | No shared "progress" concept a DOM element and a 3D camera can both read from | Scroll Storytelling — this is the one that breaks hardest without a fix |
| **Effect manager** | `EffectsStack` takes `effects: EffectName[]` + one flat `bloom?` prop | Doesn't scale — a second effect means a second special-cased prop, not a second registry entry | DOF/vignette/chromatic-aberration/SSR/noise, all already named as "future" in Milestone 1's docs |
| **Shader manager** | Doesn't exist. Steam is a billboard + canvas-texture placeholder, no GLSL anywhere | No folder structure, no shared uniform/utility convention | Steam shaders, Coffee liquid physics (this milestone and the next) |
| **Performance manager** | `DevPanel` is read-only observability, no budget enforcement, no adaptive quality, no LOD | Can *see* a problem, can't *react* to one | Mobile stability as scene complexity grows |
| **Event system** | Three independent, ad hoc zustand stores (`ui-store`, a dev-stats store, a keyboard-rotation bridge store), each invented per-need | No documented convention for "is this a store or a one-shot event," so the next one gets invented again | Ingredient-drop events, AI Barista Q&A state, cross-cutting signals in general |
| **Debug layer** | `DevPanel` hardcoded to hero-cup (imports `CameraPresetName` directly, mounted only in `Hero.tsx`) | Doesn't generalize to whichever scene is active | Any second scene |

## What's already right and should be preserved, not replaced

- The registry/contract pattern itself — generalize it, don't reinvent it.
- The `ssr:false` SSR boundary strategy — extend verbatim to any future 3D-touching route.
- Reduced-motion-first design discipline — extend to every new animation system (GSAP timelines included).
- Token-driven, single-source-of-truth color/motion values — extend to shader uniforms (shaders read from the same token pipeline via `oklchToSrgb`, never hardcode their own palette).
- The engineering-review + Creative Director Review discipline at milestone end — unchanged.

## Detailed design docs (Tasks 2–8)

Each of the following is a complete, standalone reference doc — this RFC doesn't restate their content, it explains why they exist and how they relate:

- **[03_3D_ENGINE.md](03_3D_ENGINE.md)** (Task 2 + Task 4) — the manager architecture (Scene, Camera, Environment, Lighting, Material, Texture, Asset, Effect managers) and the rendering pipeline (render loop, frameloop/invalidation strategy, EffectComposer ordering, tone mapping, shadows).
- **[04_MOTION_ENGINE.md](04_MOTION_ENGINE.md)** (Task 7) — the animation architecture: which tool (Framer Motion / GSAP / raw `useFrame`) owns which kind of animation, and the shared "progress" mechanism that lets scroll storytelling drive both a 3D camera and DOM text from one timeline.
- **[3d-asset-pipeline.md](3d-asset-pipeline.md)** (Task 3) — GLB/texture/HDR/audio workflow, Draco/KTX2/Meshopt compression, versioning, caching, lazy-loading, streaming, fallback assets.
- **[12_INTERACTION_SYSTEM.md](12_INTERACTION_SYSTEM.md)** (Task 5) — the Interaction Manager: mouse/touch/stylus/keyboard/future-gamepad as one device-agnostic gesture layer, accessibility and reduced-motion as first-class inputs, not afterthoughts.
- **[13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md)** (Task 6) — the Shader Manager, folder structure, and common-utility conventions for steam/foam/coffee/particles/glow/distortion/noise.
- **[14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md)** (Task 8) — budgets (FPS, GPU memory, texture/geometry/draw-call targets), LOD strategy, adaptive quality, Suspense boundaries.
- **[adr/0006 through 0009](adr/)** — the four biggest individually-reversible-cost decisions this design makes (scene-management strategy, animation-orchestration ownership, shader-authoring approach, compression pipeline choices).

## Roadmap (Task 10)

**[milestone-2-implementation-plan.md](milestone-2-implementation-plan.md)** — the checkpoint-by-checkpoint build order, written *after* every design doc above, so each checkpoint is "populate this registry / add this implementation," never "redesign this system." Not started; waiting for approval of this RFC first, per instruction.

## Related

[00_SYSTEM_PROMPT.md](00_SYSTEM_PROMPT.md) · [01_ARCHITECTURE.md](01_ARCHITECTURE.md) · [08_MILESTONES.md](08_MILESTONES.md) · [reviews/milestone-1-final-report.md](reviews/milestone-1-final-report.md)
