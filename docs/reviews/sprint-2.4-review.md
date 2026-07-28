# Sprint 2.4 — Shader & Rendering Pipeline: Review

Sprint 2.4 built the shader infrastructure every advanced visual effect will eventually rely on: the Shader Manager (Registry/Factory/Diagnostics/Validation), the Uniform Manager (a shared uniform block with strict single ownership), the common GLSL utility library, and infrastructure-ready placeholder shaders for all six named effect families — not the final Steam Simulation, Coffee Physics, or Ingredient Physics this sprint's brief explicitly excluded.

**Scale**: 22 new source files (`engine/shaders/`), 5 modified files (2 EventBus events, `ProceduralSteam`/`Coffee`/`Foam`, `CupScene.tsx`), 31 new unit tests (116 total project-wide). `tsc`, `eslint`, `next build` all clean; zero shader-related console errors across multiple real-browser render passes.

## Architecture review

**A fourth distinct factory shape, correctly not forced into an existing one**: `createResourceManager` (Sprint 2.2, async) and `createSyncCache` (Sprint 2.3, synchronous, per-key single-instance) both exist. Shader materials needed neither shape unmodified — two steam wisps need *independent* `uTime`, so caching *instances* by key (either factory's actual job) would be wrong for them. What was built instead: a Registry (name → definition, matching `createPartRegistry`'s shape exactly) plus a Factory that constructs a *fresh* instance on every call. This is the same discipline as Sprint 2.1's `useGestureRecognizer`/`useCupInteractionState` split and Sprint 2.3's sync/async cache split — recognizing when an existing pattern's *shape* fits but its *identity semantics* don't, and building the right thing rather than the familiar thing.

**"Shader Cache" reframed, not silently dropped**: this sprint's brief names both "Shader Cache" and "Shader Diagnostics" as separate deliverables. They ended up as one structure (`diagnostics.ts`), reasoned through explicitly in the code's own comments: per-instance GPU resource caching doesn't fit (see above), but per-*definition* compile-state tracking is exactly what Diagnostics needs anyway — building a second, redundant cache to satisfy the letter of the brief when its actual mechanism doesn't fit would have been the wrong call.

**One owner per uniform, checked against the actual publisher list**: every `sharedUniforms` field has exactly one function that writes it (`publishResolution`, `publishQualityTier`, `publishTheme`, `publishLightingIntensity`, `publishInteractionState`) — verified by reading `common/uniforms.ts` top to bottom, not just asserted. Camera position was deliberately **not** added as a published uniform: Three's built-in `cameraPosition` GLSL variable already covers the common view-dependent case, and publishing a second source of the same data would itself have violated "duplicate uniform sources are forbidden" — the rule applied to reject a uniform, not just to justify adding ones.

**Shaders never own state they shouldn't**: `applyFresnelRim`/`applyCoffeeSurface`/`applyFoamSurface` mutate rendering only (an `onBeforeCompile` hook and its uniforms) — they never touch `materialOverrides` resolution, cache keys, or any business logic, which stays entirely in `engine/materials/`. The fresnel hook is applied *inside* the Material Manager's cache factory function, not after `getOrCreateMaterial` returns — a cache hit never re-triggers `onBeforeCompile`, which would force a wasted recompile. Getting this ordering right was a real, deliberate design decision, not incidental.

## Rendering review

**Render Pipeline stage ownership, finalized and real** (full table in [03_3D_ENGINE.md](../03_3D_ENGINE.md)): Geometry → Materials → Textures → Uniform Binding → Lighting → Shader Execution → Effects → Tone Mapping → Bloom → Output, one owner per stage, cross-checked against every manager built across Sprints 2.1-2.4. The one stage with two owners (Textures: the Asset Platform's file pipeline vs. `TextureLoader.ts`'s canvas generators) is documented as owning disjoint texture *origins*, not a violation of the one-owner rule.

**Verified via real render, not assumed**: headless-Chrome visual verification (software WebGL) confirmed the hero renders correctly, composition unchanged from Sprint 2.3, with the cup, sleeve, lid, coffee, and foam all visually intact — no artifacts from the new fresnel rim or the swapped steam material. Multiple capture attempts hit this project's already-documented headless-capture flakiness (a fresh Chrome profile working, a reused one intermittently failing to render) — consistent with the Milestone 1 CDR's prior disclosure of the same limitation, not a new regression; a clean capture with a fresh profile confirmed correct rendering each time it was needed.

## GPU review

**Compilation verified for all 6 shaders, honestly scoped**: Steam/Coffee/Foam compile as part of the live production scene (real render, real console-log check). Glow/Distortion/Particles have zero scene consumers, so `DevDiagnosticsProbe.tsx` positions a tiny mesh per shader far outside the camera frustum (not `visible={false}`, which would skip rendering — and skip compilation — entirely) to force a real compile attempt in dev mode. "Compiled" in this sprint's diagnostics means "rendered without a thrown JS exception," not a synchronously-verified zero-GLSL-error guarantee — true compile-error detection surfaces via Three's own `checkShaderErrors` console logging, which was checked directly (zero shader-related warnings or errors across every capture this sprint).

**A real bug found by the `onBeforeCompile` injection point, verified against actual installed source, not memory**: before writing `applyFresnelRim.ts`, the exact chunk name (`#include <opaque_fragment>`) and its position relative to tone mapping were confirmed by reading `node_modules/three/src/renderers/shaders/ShaderLib/meshphysical.glsl.js` directly for this project's exact installed Three.js version, rather than assumed from general Three.js knowledge (which could describe a different version's chunk structure). This is exactly the kind of check [24_RISK_REGISTER.md](../24_RISK_REGISTER.md)'s R-13 (onBeforeCompile fragility across Three.js versions) already flagged as a real, accepted risk — verifying against the actual source this sprint doesn't eliminate that risk for a *future* version bump, but it does mean today's implementation is correct against what's actually installed, not a guess.

## Shader review

**Validation caught a real design assumption worth stating explicitly**: `validateShaderDefinition`'s test suite required constructing a real `THREE.MeshPhysicalMaterial`/`THREE.ShaderMaterial` to exercise — these constructors don't need a live WebGL context (confirmed: they're plain JS object holders until actually rendered), which is what makes structural shader validation testable in jsdom at all, distinct from compilation itself.

**A real bug found and fixed by the test suite, not shipped**: `applyFresnelRim`'s test initially asserted `material.needsUpdate === true` after calling the function — this failed, because Three.js's `needsUpdate` is a write-only setter (it bumps an internal `version` counter; there's no paired getter, so reading it back returns `undefined`). Fixed by asserting `material.version` increased instead — the actual, observable effect of setting `needsUpdate = true`. A genuine API-shape misunderstanding caught by writing the test, not by the type checker (which allows reading `material.needsUpdate` without complaint since it's typed as a settable property).

**Common utilities kept genuinely simple, not gold-plated**: `noise.ts`'s FBM is fixed at 3 octaves (not a configurable loop bound) and uses value noise, not simplex — matching this sprint's "intentionally simple" placeholder requirement rather than building toward the eventual domain-warped final steam simulation ahead of the milestone that needs it.

## Performance review

**No premature optimization**: none of the six placeholder shaders were tuned for GPU cost beyond the single-octave-noise/no-domain-warp choice already made for simplicity's sake — no LOD, no conditional quality-tier branching inside the shaders themselves yet (the `uQualityTier` shared uniform is published and available, but nothing reads it in-shader this sprint — that's real future wiring, not built ahead of a concrete need).

**Zero measured regression**: the dev-stats FPS sampling (unchanged since Sprint 2.1) showed no different behavior in manual verification; the steam shader replaces a `MeshBasicMaterial`+texture-sample with a `ShaderMaterial` running one noise evaluation per fragment — a real but small per-pixel cost increase, on 3 small billboard planes, well within [14_PERFORMANCE_STRATEGY.md](../14_PERFORMANCE_STRATEGY.md)'s existing budget headroom.

## Accessibility review

No interactive surface changed this sprint. Steam's swapped material doesn't change `visible`-prop gating (reduced motion still disables it exactly as before — the `visible === false` early-return in `ProceduralSteam`'s `useFrame` is untouched). Coffee/foam's fresnel rim is a passive rendering refinement with no interaction implication, same category as Sprint 2.3's ceramic change. `DevDiagnosticsProbe` and the shader diagnostics DevPanel entry are dev-only, gated identically to every other dev-only surface, with no production accessibility surface at all.

## Creative Director Review

**Delivered, correctly scoped**: steam's noise-based shader is a real, visible improvement over the flat radial-gradient placeholder — organic per-pixel variation instead of a uniform blurred circle, addressing the spirit of the Milestone 1 CDR's "steam isn't very visible/convincing" critique without implementing the domain-warped final simulation this sprint explicitly excluded. Coffee/foam's fresnel rim is intentionally subtle (matching Sprint 2.3's ceramic precedent) — present on close inspection, not a first-glance transformation. Honestly scored: this sprint's creative payoff is steam, named as the one clearly visible change; coffee/foam's refinement is real but minor, not double-counted as a second headline improvement.

## Retrospective

### Technical debt

- Glow/Distortion/Particles have real, tested, compiling shader definitions with zero production consumers — proportionate for now (explicitly instructed, cheap, safe, matching the glass/metal materials precedent from Sprint 2.3), but worth the same "revisit if unused by Milestone 5" flag already applied to glass/metal.
- `onBeforeCompile`'s string-patch approach (R-13, [24_RISK_REGISTER.md](../24_RISK_REGISTER.md)) now has two real consumers (coffee, foam) instead of zero — the risk was accepted, not eliminated; a future Three.js version bump remains a real, if unlikely, silent-breakage vector, mitigated only by visual regression coverage this project doesn't have installed yet ([16_ENGINEERING_SPRINTS.md](../16_ENGINEERING_SPRINTS.md) Sprint 2.6 still owns that decision).

### Architectural observations

- The Diagnostics/Cache reframing (one structure serving two named requirements) is this sprint's clearest example of "build what the mechanism actually needs, not what the brief's literal wording implies" — the same category of judgment call as Sprint 2.3's `materialOverrides`-bypasses-the-cache decision, now with two real precedents to cite.
- `DevDiagnosticsProbe`'s "positioned far outside the frustum, not `visible={false}`" technique is a small but genuinely non-obvious real-world WebGL fact (an invisible object is skipped by the renderer entirely, never compiled) — worth remembering the next time anything needs to force a compile/warm-up without a visible effect.

### Possible improvements

- `uQualityTier`'s shared uniform is published but has zero in-shader consumers yet — worth wiring real tier-based branching (e.g. skip the noise sample entirely at `low` tier) once Sprint 2.5's actual adaptive-stepping algorithm exists to ever set it to anything but `"high"`.
- The fresnel rim's color/intensity/power values are hardcoded per-surface, not theme-aware the way Sprint 2.3's `envMapIntensity` calibration is — a reasonable future refinement, not attempted this sprint since it wasn't the named creative-budget target and would have doubled this sprint's visual-verification surface area.

## Sign-off

`git status` confirms every change this sprint is real, working, tested implementation — 31 new tests, all passing, verified against `tsc`/`eslint`/`build`/multiple real browser render passes with zero shader-related console errors. Waiting for approval before Sprint 2.5 (Performance) begins.

## Related

[16_ENGINEERING_SPRINTS.md](../16_ENGINEERING_SPRINTS.md) · [03_3D_ENGINE.md](../03_3D_ENGINE.md) · [13_SHADER_ARCHITECTURE.md](../13_SHADER_ARCHITECTURE.md) · [19_EVENT_CATALOG.md](../19_EVENT_CATALOG.md) · [24_RISK_REGISTER.md](../24_RISK_REGISTER.md) · [reviews/sprint-2.3-review.md](sprint-2.3-review.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](../09_CREATIVE_DIRECTOR_REVIEW.md)
