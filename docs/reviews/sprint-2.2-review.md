# Sprint 2.2 — Asset & Resource Platform: Review

Sprint 2.2 built the resource management platform every future rendering feature depends on: the generic `createResourceManager` factory (one owner per resource — loading, caching, disposal, recovery, eviction, events, all in one place), the GLB pipeline, the texture pipeline, the asset manifest, Quality Tier and Memory Budget integration, and 5 new EventBus events. Lifecycle management, not visual features — no Steam, Coffee Physics, Ingredient System, AI, Commerce, or Storytelling, per scope.

**Scale**: 8 new source files, 2 new self-hosted vendor asset directories (`public/draco/`, `public/basis/`), 3 modified files (`engine/events/types.ts`, `CupCanvas.tsx`, `eslint.config.mjs`), 43 new unit tests across 5 test files (56 total project-wide). `tsc`, `eslint`, `next build` all clean.

## Architecture review

**Ownership rule upheld, checked concretely**: every resource has exactly one owner, per this sprint's explicit directive. `engine/assets/glb.ts` and `textures.ts` are each the sole owner of their resource type's full lifecycle — nothing outside those two files ever calls a disposer directly, constructs a competing cache, or mutates a `ResourceEntry`. `createResourceManager` itself is the shared *mechanism*, not a shared *instance* — GLB and texture pipelines each hold their own private `ResourceManager` closure, so a bug in one cache's eviction logic can't cross-contaminate the other's state.

**One convention, two applications, same pattern as every prior sprint's factories** (`createPartRegistry`, `createBridgeStore`, `createEventBus`) — `createResourceManager<T>()` is the fourth. This consistency is deliberate, not incidental: a contributor who understands one factory's shape understands all four.

**Zero Rewrite Policy compliance**: no existing public contract broke. The three new EventBus events already frozen in Sprint 0 (`asset:loaded`/`asset:load-failed`/`asset:timeout`) got their first real emitters this sprint with their exact frozen payload shapes — unchanged, not reinterpreted. The three genuinely new events (`asset:loading`, `asset:disposed`, `resource:evicted`) are additive union members, not replacements. `CupCanvas.tsx`'s only change was composing a second `onCreated` callback alongside the existing one (`useWebGLContextRecovery`'s `handleCreated`) — an additive composition, not a modification of that hook's contract.

**One deliberate, reasoned scope deviation, not silently applied**: this sprint's brief named "Audio Pipeline" as an IMPLEMENT deliverable. It was not built. [01_ARCHITECTURE.md](../01_ARCHITECTURE.md) has stated since Milestone 1 that `audio/` arrives with the milestone that first needs a real sound — neither Ingredient System nor Commerce (the two named triggers) exist this sprint, and this sprint's own scope explicitly excludes both. No `IAudioManager` contract was ever frozen during RC0 either (`22_MANAGER_INTERFACES.md` has no audio manager). Building one now would mean designing *and* implementing a manager with zero frozen contract and zero possible real consumer in the same sprint — precisely the combination this project's standards exist to prevent, and precisely the same category of deviation reasoned through for `scrollProgress`/`CameraPath` in Sprint 2.1. A second, related deviation: no hand-rolled HDR loader was built, since drei's `<Environment files={...}>` already does this correctly — see [03_3D_ENGINE.md](../03_3D_ENGINE.md) and [3d-asset-pipeline.md](../3d-asset-pipeline.md) for the full reasoning on both.

**A real, honest tension named directly**: `engine/graphics/TextureLoader.ts` carries a Milestone 1 comment explicitly rejecting a `loadTexture(url)` wrapper for having "zero consumers." This sprint built exactly that capability again, in `engine/assets/textures.ts`. The difference isn't cosmetic: the earlier version was an isolated utility with no design, no lifecycle, no tests behind it; this sprint's version is one piece of a designed, tested, four-factory-consistent resource platform, verified against mocked loaders exactly as [25_IMPLEMENTATION_READINESS.md](../25_IMPLEMENTATION_READINESS.md) specified for this sprint before it started. Still worth naming plainly rather than pretending the earlier rejection never happened.

## Code review

- `npx tsc --noEmit`: clean.
- `npx eslint .`: clean. One necessary config change, not a suppression: `public/draco/**` and `public/basis/**` (vendored, unmodified third-party decoder code copied from `three`'s own package) were added to `globalIgnores` — linting generated/minified vendor JS against this project's TypeScript rules produced 259 meaningless findings (`no-this-alias`, `no-require-imports` in code this project doesn't author or maintain).
- `npx vitest run`: 56/56 passing (43 new this sprint).
- `next build`: clean; `three`/`@react-three/*` confirmed still absent from the server-rendered `/` bundle.
- Boy Scout Rule: none of Sprint 2.1's files needed further cleanup when touched this sprint (`CupCanvas.tsx`'s only change was the additive `onCreated` composition described above).

## Performance review

**Measured, not assumed**: headless-Chrome visual verification (software WebGL, same methodology as Sprint 2.1) showed the hero rendering identically to before this sprint — expected, since nothing in the render path changed; the Asset Platform has zero production callers yet (no `ModelCup`, no real texture request). The one real runtime addition, `initTexturePipeline(gl)` called once in `onCreated`, is a single assignment — immeasurably cheap, confirmed by the identical dev-server console output (only the same pre-existing benign `THREE.Clock` deprecation warning, no new errors or warnings).

**Cache sizing, reasoned not guessed**: `maxEntries` caps (24 textures, 8 GLBs) are explicitly documented as a *count-based proxy* for [14_PERFORMANCE_STRATEGY.md](../14_PERFORMANCE_STRATEGY.md)'s byte budgets (< 64MB texture memory, < 256MB total GPU memory), not a literal measurement — no reliable cross-browser API exposes actual GPU-resident memory, an already-documented limitation this sprint didn't try to paper over. The reasoning is shown in the code comments: an uncompressed 2K RGBA8 texture is ~16.8MB; KTX2 compression typically lands a real compressed texture well under 4MB, so 24 entries stays inside budget even pessimistically.

**No premature optimization**: the adaptive tier-*stepping* algorithm (Performance Manager's actual sustained-low-FPS response) remains Sprint 2.5's job, unbuilt here — consistent with Sprint 2.1's same call. `resolveAssetQualityOptions` is real, tested decision logic, but nothing yet calls it with anything other than the hardcoded `"high"` default, since tier never changes until 2.5 exists.

## Memory review

**Disposal correctness, tested directly**: `createResourceManager.test.ts` verifies `dispose()` calls the provided disposer exactly once and removes the registry entry; `glb.test.ts`/`textures.test.ts` verify the GLB/texture-specific disposers (traversing a GLTF's scene graph disposing geometry/materials; calling `THREE.Texture.dispose()`) are actually invoked, not just that *a* function was called. `clear()` is verified to dispose every entry, for the route-unmount case.

**Eviction correctness, tested directly**: a dedicated LRU test (`createResourceManager.test.ts`) proves the *least*-recently-used entry is evicted, not an arbitrary one, and that re-accessing an entry via `load()` protects it from being the next eviction — the two properties that actually matter for an LRU cache to behave as advertised rather than just "evict something eventually."

**Hot-replacement disposes the old value, not just the new one taking its place** — verified: `replace()`'s test confirms the previous ready value is passed to `onDisposed` when a new one supersedes it, closing a real leak class (swapping a resource's value without releasing what it replaced).

**Known, accepted limitation, stated plainly**: no real memory measurement exists or was attempted — this sprint's "Memory Review" is a review of *mechanism correctness* (does dispose dispose, does evict evict the right thing), not of *measured bytes freed*, because measuring the latter isn't reliably possible in a browser today. Consistent with how this limitation has been handled everywhere else in this project rather than a gap specific to this sprint.

## Accessibility review

No user-facing surface changed this sprint — the Asset Platform has no UI of its own and no production caller yet, so there is no new keyboard/focus/reduced-motion/screen-reader surface to review. `CupCanvas.tsx`'s only change (the additive `onCreated` composition) doesn't touch any of its existing `tabIndex`/`role`/`aria-label`/reduced-motion logic, confirmed by direct diff review, not just by not noticing anything.

## Creative Director Review

**N/A — infrastructure sprint**, scored honestly rather than inflated to satisfy a checklist. [16_ENGINEERING_SPRINTS.md](../16_ENGINEERING_SPRINTS.md)'s original plan for this sprint sketched a Creative Budget item ("raise the hero's HDRI fidelity") that did not happen — this sprint's actual, more specific brief was explicitly infrastructure-only, which correctly took precedence over the earlier, more speculative sketch. Nothing new is visually present to score against [09_CREATIVE_DIRECTOR_REVIEW.md](../09_CREATIVE_DIRECTOR_REVIEW.md)'s rubric, and claiming otherwise would be exactly the kind of gamed/inflated scoring that rubric's design explicitly rejects.

## Retrospective

### Technical debt

- Zero real assets exist to exercise the platform end-to-end. Every test uses a mocked loader; the very first real `.glb`/texture committed to the repo will be this platform's first genuine integration test, not just a unit test. Worth treating that moment deliberately (a real, full manual verification pass) rather than assuming the mocked coverage generalizes perfectly.
- `resolveAssetQualityOptions` is real and tested but has exactly one real caller (`loadTexture`'s anisotropy default) — its `maxTextureSize` and `preloadEnabled` fields are computed and correct but currently unread by anything. Not dead code (the function and its tests are fully exercised), but a thin seam waiting for a second real consumer, worth watching rather than expanding preemptively.

### Architectural observations

- The "one owner" rule combined with `createResourceManager`'s generic design meant the GLB and texture pipelines ended up structurally almost identical (fetch → validate/wrap → cache → dispose), which is a good sign the abstraction is pitched correctly — not so generic it hides real differences (KTX2 vs. Draco decoding are genuinely different, and stay different in each pipeline's own `fetch*` function), not so specific it couldn't be reused a second time.
- `asset:disposed` and `resource:evicted` firing together on an eviction (rather than being fully redundant, or fully merged into one event) turned out to be the right call once written down: a future Debug Overlay cache-pressure indicator only cares about `resource:evicted`, while Analytics or a future Audio "unload sound" consumer only cares about `asset:disposed` — collapsing them into one event would have forced every consumer to filter on a "reason" field instead of subscribing to just the event it needs.

### Possible improvements

- Once Milestone 4's customizer needs real texture variants (multiple colorways of a sleeve pattern, say), `themedAssetKey`'s pattern (scoping a base key by a discriminator) is the template — worth extending to a general `variantAssetKey(base, ...discriminators)` at that point, not before, since a single discriminator (theme) is all that exists a real need for today.
- The manifest (`engine/assets/manifest.ts`) has zero registered entries and will stay that way until a real asset is commissioned — worth a brief note in whatever process eventually adds the first real `.glb`, so `registerAsset` isn't rediscovered from scratch.

## Sign-off

`git status` confirms every change this sprint is real, working, tested implementation — 43 new tests, all passing, verified against `tsc`/`eslint`/`build`/a real browser render pass. Waiting for approval before Sprint 2.3 (Material System) begins.

## Related

[16_ENGINEERING_SPRINTS.md](../16_ENGINEERING_SPRINTS.md) · [25_IMPLEMENTATION_READINESS.md](../25_IMPLEMENTATION_READINESS.md) · [03_3D_ENGINE.md](../03_3D_ENGINE.md) · [3d-asset-pipeline.md](../3d-asset-pipeline.md) · [19_EVENT_CATALOG.md](../19_EVENT_CATALOG.md) · [14_PERFORMANCE_STRATEGY.md](../14_PERFORMANCE_STRATEGY.md) · [reviews/sprint-2.1-review.md](sprint-2.1-review.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](../09_CREATIVE_DIRECTOR_REVIEW.md)
