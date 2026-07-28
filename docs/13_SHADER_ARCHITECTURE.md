# 13 — Shader Architecture

Target design (Milestone 2+) — **no GLSL exists in this codebase yet**. Steam today is billboarded planes with a canvas-generated radial-gradient texture (`engine/graphics/TextureLoader.ts`'s `createRadialGradientTexture`), a deliberate placeholder documented in [3d-asset-pipeline.md](3d-asset-pipeline.md) and [state-machine.md](state-machine.md). This doc designs what replaces it, and the shared machinery every future shader (foam, coffee, particles, glow, distortion) builds on — so the *second* shader is a folder-and-interface exercise, not a rediscovery of the first one's conventions.

## Two shader authoring paths — pick per surface, not globally

This is the one decision every future shader needs to make correctly, so it's stated once here rather than re-derived per effect:

| Surface is... | Use | Why |
|---|---|---|
| **Physically lit** — needs to look like it belongs in the HDRI-lit, shadow-casting scene the cup already lives in (coffee, foam) | Extend an existing `MeshPhysicalMaterial` via `material.onBeforeCompile`, injecting custom vertex/fragment logic into Three's *own* PBR shader chunks | Reimplementing PBR lighting by hand in a fully custom shader is wasted, error-prone effort — Three's built-in lighting model already does it correctly; the goal is custom vertex displacement (ripples, tilt) and minor fragment tweaks, not a new lighting model |
| **Unlit / effect-driven** — inherently glowy, additive, or emissive, not meant to physically respond to scene lighting (steam, particle glow, distortion) | A dedicated custom material via drei's `shaderMaterial()` helper (typed uniforms, registered as real JSX via `extend()`) | These effects were never physically lit to begin with — a full custom shader is the natural fit, not a workaround |

Getting this backwards is the most likely shader-related mistake this project could make: hand-rolling PBR lighting inside a fully custom `ShaderMaterial` for the coffee surface would be strictly worse (more code, more bugs, worse visual consistency with the rest of the scene) than the `onBeforeCompile` approach.

## Folder structure

```
engine/shaders/
├── common/
│   ├── noise.ts          vendored simplex/perlin noise GLSL (Ashima Arts' webgl-noise, MIT), exported as a string
│   ├── remap.ts           small reusable GLSL math snippets (remap, ease curves) as string exports
│   └── uniforms.ts        shared uniform-building helpers (e.g. injecting design tokens as uColor uniforms via ColorSchemes)
├── steam/
│   ├── SteamMaterial.ts   drei shaderMaterial() definition + extend() registration
│   ├── steam.vert.ts      vertex shader source (template string)
│   └── steam.frag.ts      fragment shader source (template string)
├── foam/          (Milestone 2, once steam proves the pattern)
├── coffee/        (Milestone 3, liquid physics)
├── particles/     (Milestone 5, ingredient system)
├── glow/          (as needed — see "Glow vs. Bloom" below)
├── distortion/    (as needed — heat-shimmer near steam, low priority)
```

No folder here is created before its milestone needs it — same discipline as `audio/`/`features/commerce/` in [01_ARCHITECTURE.md](01_ARCHITECTURE.md)'s "Future modules." `common/` is the one exception, created alongside the *first* real shader (steam), since every subsequent shader depends on it from day one.

## Why shader source lives in `.ts` template strings, not `.glsl` files

A `.glsl`-file-import pipeline (via a bundler loader/plugin) is the more conventional setup in older Vite/webpack-based Three.js projects, but Turbopack (Next.js 16's default, and this project's bundler) doesn't have the same mature ecosystem of community loader plugins yet. Rather than take on that risk mid-implementation, shader source is plain TypeScript template strings, and `common/`'s shared snippets are just string constants concatenated in via template-literal interpolation — the exact mechanism Three.js's own built-in `THREE.ShaderChunk` system uses internally for its `#include`-style composition, applied at our own project's scale. Zero new build tooling, fully portable, easy to reconsider later if Turbopack's GLSL-loader ecosystem matures — see [ADR-0008](adr/0008-shader-authoring-approach.md).

## Steam (the reference implementation for everything after it)

Replaces the billboard+static-texture placeholder with a real animated shader, addressing the concrete, disclosed critique from the Milestone 1 Creative Director Review ("steam isn't very visible/convincing against a bright background"):

- Geometry stays simple billboard planes (`Billboard` from drei, unchanged) — this was never the part that needed to be "real," a full GPU particle system would be disproportionate cost for a decorative wisp.
- Fragment shader combines **domain-warped simplex noise** (from `common/noise.ts`) — noise sampling a UV coordinate that's itself offset by a second noise sample, the standard technique for organic, non-repeating swirl instead of an obviously periodic pattern — with a **vertical UV scroll** (rise) driven by a `uTime` uniform, and a soft alpha falloff toward the plane's edges and top (fading as it dissipates).
- Additive blending, unlit — steam doesn't need to physically respond to scene lighting to read correctly; this is squarely the "unlit/effect-driven" path above.

## Foam (Milestone 2)

Physically-lit path. Vertex shader perturbs the existing foam disc's outer edge with a slow, small-amplitude noise displacement (replacing the current one-time-computed irregular edge in `createFoamGeometry` with a live-animated one) via `onBeforeCompile` on the existing `createFoamMaterial()` output. Fragment tweak: a fresnel-based rim brightening (foam's micro-bubble structure catches light at grazing angles more than a smooth surface would) — a cheap approximation, not true subsurface scattering, which would be disproportionate cost for a decorative rim highlight.

## Coffee (Milestone 3 — liquid physics)

Physically-lit path, and the one with real interaction-driven behavior, not just ambient motion:

- **Tilt**: a `uTiltAngle` uniform (a spring-damper value computed in JS from the cup's rotation velocity — see [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md)'s "not a physics engine" note) rotates the liquid surface's displacement around its center in the vertex shader, reading the same rotation state `useCupInteractionState` already tracks.
- **Ripples**: a small fixed-size array of `{ origin: vec2, startTime: float }` uniforms, each producing a decaying sine wave from its origin; a new ripple is triggered by the same drag/release interaction events the Interaction Manager (see [12_INTERACTION_SYSTEM.md](12_INTERACTION_SYSTEM.md)) already recognizes, not a new input mechanism.
- Extends `createLiquidMaterial()` the same way foam extends its factory — one shared `onBeforeCompile` convention, not two different techniques for two similar surfaces.

## Particles (Milestone 5 — ingredient system)

Unbuilt, shape only. Likely `InstancedMesh` with per-instance attributes (position, scale, rotation, fade) driven by a lightweight vertex shader reading instance attributes rather than N individually-animated meshes — the GPU-optimization rule from [03_3D_ENGINE.md](03_3D_ENGINE.md) ("instancing for repeated geometry") applied to whatever the ingredient system's particulate elements turn out to be (sugar, cinnamon dust, ice fragments).

## Glow, vs. Bloom — not redundant, different scope

`EffectsStack`'s Bloom (see [03_3D_ENGINE.md](03_3D_ENGINE.md)) is a **screen-space post-process** — it blooms *everything* above a luminance threshold, uniformly, project-wide. A `glow/` shader is a **targeted, per-object** effect (a rim-light glow on one specific ingredient or highlight) applied only where a specific object needs emphasis Bloom's global threshold wouldn't isolate on its own. They compose (a glowing object can also contribute to the global Bloom pass), they don't duplicate each other.

## Distortion

Lowest priority, genuinely optional — a heat-shimmer-style UV distortion near actively-rising steam. Registered here for completeness because Task 6 named it explicitly; not scheduled in [milestone-2-implementation-plan.md](milestone-2-implementation-plan.md) unless steam's shipped shader turns out to need it for a convincing result.

## Related

[03_3D_ENGINE.md](03_3D_ENGINE.md) · [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md) · [3d-asset-pipeline.md](3d-asset-pipeline.md) · [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md) (frozen uniform/naming conventions) · [adr/0008-shader-authoring-approach.md](adr/0008-shader-authoring-approach.md) · [reviews/milestone-1-creative-director-review.md](reviews/milestone-1-creative-director-review.md)
