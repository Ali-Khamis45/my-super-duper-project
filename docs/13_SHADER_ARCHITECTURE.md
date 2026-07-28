# 13 — Shader Architecture

**Sprint 2.4 implemented the infrastructure and six intentionally simple placeholder shaders — not the final effects this doc originally designed.** Where a section below describes something now real, it's marked "Implemented, Sprint 2.4 (placeholder)"; where it still describes a later milestone's final version, it's marked "Still target." See [03_3D_ENGINE.md](03_3D_ENGINE.md)'s Current State section and [reviews/sprint-2.4-review.md](reviews/sprint-2.4-review.md) for what actually shipped.

## Two shader authoring paths — pick per surface, not globally

This is the one decision every future shader needs to make correctly, so it's stated once here rather than re-derived per effect:

| Surface is... | Use | Why |
|---|---|---|
| **Physically lit** — needs to look like it belongs in the HDRI-lit, shadow-casting scene the cup already lives in (coffee, foam) | Extend an existing `MeshPhysicalMaterial` via `material.onBeforeCompile`, injecting custom vertex/fragment logic into Three's *own* PBR shader chunks | Reimplementing PBR lighting by hand in a fully custom shader is wasted, error-prone effort — Three's built-in lighting model already does it correctly; the goal is custom vertex displacement (ripples, tilt) and minor fragment tweaks, not a new lighting model |
| **Unlit / effect-driven** — inherently glowy, additive, or emissive, not meant to physically respond to scene lighting (steam, particle glow, distortion) | A dedicated `THREE.ShaderMaterial`, constructed directly (`new THREE.ShaderMaterial({...})`) | These effects were never physically lit to begin with — a full custom shader is the natural fit, not a workaround |

**Implemented, Sprint 2.4**: drei's `shaderMaterial()` + `extend()` (originally planned below) turned out to be unnecessary — every unlit shader here is consumed imperatively (`useMemo`, assigned to a `<mesh material={...}>` prop), matching the pattern every cup part material already uses; `extend()`'s JSX registration only pays for itself for declarative `<xMaterial />` usage, which nothing needs yet. Constructing `THREE.ShaderMaterial` directly is simpler and was the actual choice — noted here as a real, reasoned deviation from the original sketch, not an oversight.

Getting this backwards is the most likely shader-related mistake this project could make: hand-rolling PBR lighting inside a fully custom `ShaderMaterial` for the coffee surface would be strictly worse (more code, more bugs, worse visual consistency with the rest of the scene) than the `onBeforeCompile` approach.

## Folder structure

**Implemented, Sprint 2.4** — all folders below now exist, ahead of their originally-sketched milestones. This is a deliberate exception to "no folder before its milestone needs it": this sprint's explicit brief named all six placeholder shaders by name as a required deliverable, proving the pipeline compiles for every effect family at once rather than one at a time — see [reviews/sprint-2.4-review.md](reviews/sprint-2.4-review.md) for the full reasoning:

```
engine/shaders/
├── common/
│   ├── noise.ts          hash + value noise + fbm GLSL (own implementation, not Ashima Arts' — see below), string exports
│   ├── rotation.ts        2D rotation matrix helper
│   ├── blending.ts        blend-mode helpers (screen, soft-light)
│   ├── colorSpace.ts      linear/sRGB (gamma-2.2 approximation, not the JS-side exact conversion)
│   ├── toneMapping.ts     Reinhard, for self-tonemapping additive effects before Bloom
│   ├── easing.ts          GLSL easing curves
│   └── uniforms.ts        the Uniform Manager — shared block + per-instance builders
├── registry.ts, factory.ts, diagnostics.ts, validation.ts   Shader Manager infrastructure
├── DevDiagnosticsProbe.tsx   dev-only, forces real compilation of every unlit shader
├── surfaces/
│   └── applyFresnelRim.ts   shared onBeforeCompile injection, used by coffee and foam
├── steam/       real, wired — replaces the Milestone 1 billboard placeholder
├── coffee/      placeholder (fresnel rim) — full liquid physics still Milestone 3
├── foam/        placeholder (fresnel rim) — full live-animated displacement still a later milestone
├── glow/        placeholder, zero scene consumer
├── distortion/  placeholder, zero scene consumer
├── particles/   placeholder, zero scene consumer — real Milestone 5 use still pending
```

**Own noise implementation, not Ashima Arts' webgl-noise** — a deviation from the original sketch below, made for a genuine reason: this sprint's placeholders are deliberately simple (a single-octave value noise, not full simplex), so vendoring a more sophisticated third-party implementation than the placeholders actually need would have been speculative complexity. Revisit when the *final* steam/coffee/foam effects (still target, below) actually need simplex noise's better isotropy.

## Why shader source lives in `.ts` template strings, not `.glsl` files

A `.glsl`-file-import pipeline (via a bundler loader/plugin) is the more conventional setup in older Vite/webpack-based Three.js projects, but Turbopack (Next.js 16's default, and this project's bundler) doesn't have the same mature ecosystem of community loader plugins yet. Rather than take on that risk mid-implementation, shader source is plain TypeScript template strings, and `common/`'s shared snippets are just string constants concatenated in via template-literal interpolation — the exact mechanism Three.js's own built-in `THREE.ShaderChunk` system uses internally for its `#include`-style composition, applied at our own project's scale. Zero new build tooling, fully portable, easy to reconsider later if Turbopack's GLSL-loader ecosystem matures — see [ADR-0008](adr/0008-shader-authoring-approach.md).

## Steam

**Implemented, Sprint 2.4 (placeholder)**: replaces the billboard+static-texture placeholder with a real, but intentionally simple, animated shader — single-octave value noise (`common/noise.ts`'s `noise2D`), not domain-warped, plus the same vertical-rise/fade animation curve Milestone 1 already tuned (unchanged, only the material changed). Geometry stays simple billboard planes (`Billboard` from drei, unchanged). Additive-alpha, unlit.

**Still target — the final version**: **domain-warped** noise (sampling a UV coordinate itself offset by a second noise sample — the standard technique for organic, non-repeating swirl instead of an obviously periodic pattern), addressing the Milestone 1 CDR critique ("steam isn't very visible/convincing against a bright background") more fully than the current single-octave placeholder does. No milestone currently scheduled — revisit if the placeholder's visual quality doesn't hold up under a future Creative Director Review pass.

## Foam

**Implemented, Sprint 2.4 (placeholder)**: a fresnel-based rim brightening via `onBeforeCompile` on the existing `createFoamMaterial()` output (foam's micro-bubble structure catches light at grazing angles more than a smooth surface would — a cheap approximation, not true subsurface scattering). Shares `surfaces/applyFresnelRim.ts` with coffee.

**Still target**: the live-animated noise displacement on the foam disc's outer edge (replacing the current one-time-computed irregular edge in `createFoamGeometry` with a continuously-animated one) — this sprint's brief explicitly excluded it ("Do not build: Final Steam Simulation... Ingredient Physics" and "intentionally simple" placeholders only).

## Coffee

**Implemented, Sprint 2.4 (placeholder)**: the same shared fresnel rim as foam, tuned separately (warmer tint, lower intensity). Applied via the Material Manager's cache factory function, not on every retrieval — see [03_3D_ENGINE.md](03_3D_ENGINE.md).

**Still target — Milestone 3's liquid physics**, and the one with real interaction-driven behavior, not just ambient motion — explicitly excluded from this sprint ("Do not build: Final Coffee Physics"):

- **Tilt**: a `uTiltAngle` uniform (a spring-damper value computed in JS from the cup's rotation velocity — see [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md)'s "not a physics engine" note and the `velocityRef` extension it names) rotates the liquid surface's displacement around its center in the vertex shader, reading the same rotation state `useCupInteractionState` already tracks.
- **Ripples**: a small fixed-size array of `{ origin: vec2, startTime: float }` uniforms, each producing a decaying sine wave from its origin; a new ripple is triggered by the same drag/release interaction events the Interaction Manager (see [12_INTERACTION_SYSTEM.md](12_INTERACTION_SYSTEM.md)) already recognizes, not a new input mechanism.

## Particles

**Implemented, Sprint 2.4 (placeholder)**: a real, registered `unlit` shader definition (soft circular falloff + twinkle, the same radial-falloff technique steam uses) — zero scene consumer, verified compiling via `DevDiagnosticsProbe.tsx`.

**Still target — Milestone 5's ingredient system**: `InstancedMesh` with per-instance attributes (position, scale, rotation, fade) driven by a lightweight vertex shader reading instance attributes rather than N individually-animated meshes — the GPU-optimization rule from [03_3D_ENGINE.md](03_3D_ENGINE.md) ("instancing for repeated geometry") applied to whatever the ingredient system's particulate elements turn out to be (sugar, cinnamon dust, ice fragments). The Sprint 2.4 placeholder shader is a real starting point for this, not a throwaway.

## Glow, vs. Bloom — not redundant, different scope

`EffectsStack`'s Bloom (see [03_3D_ENGINE.md](03_3D_ENGINE.md)) is a **screen-space post-process** — it blooms *everything* above a luminance threshold, uniformly, project-wide. A `glow/` shader is a **targeted, per-object** effect (a rim-light glow on one specific ingredient or highlight) applied only where a specific object needs emphasis Bloom's global threshold wouldn't isolate on its own. They compose (a glowing object can also contribute to the global Bloom pass), they don't duplicate each other. **Implemented, Sprint 2.4 (placeholder)**: a real, registered, self-tonemapping (Reinhard, before Bloom's ACES pass) `unlit` shader — zero scene consumer yet, nothing currently needs a per-object glow.

## Distortion

Lowest priority, genuinely optional — a heat-shimmer-style UV distortion near actively-rising steam. **Implemented, Sprint 2.4 (placeholder)**: the noise-based UV-offset *computation*, real and registered, visualized directly as a soft shimmer pattern rather than wired into a render-target-sampling post-process pass — a *complete* screen-space distortion effect needs to sample a background render target, which is Effect Manager/EffectComposer territory (a custom pass), out of a Shader Manager sprint's scope. Revisit if steam's shipped shader turns out to need it for a convincing result.

## Related

[03_3D_ENGINE.md](03_3D_ENGINE.md) · [reviews/sprint-2.4-review.md](reviews/sprint-2.4-review.md) · [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md) · [3d-asset-pipeline.md](3d-asset-pipeline.md) · [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md) (frozen uniform/naming conventions) · [adr/0008-shader-authoring-approach.md](adr/0008-shader-authoring-approach.md) · [reviews/milestone-1-creative-director-review.md](reviews/milestone-1-creative-director-review.md)
