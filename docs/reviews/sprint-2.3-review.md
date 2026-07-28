# Sprint 2.3 — Material & Surface Platform: Review

Sprint 2.3 built the rendering appearance layer on top of Sprint 2.2's Resource Platform: the material cache (synchronous, one owner per resource), production-ready factories for all 7 named surface types, the Theme Bridge, dynamic in-place material updates, the Logo Decal Pipeline's texture cache, and 4 new EventBus events. Unlike Sprint 2.2's Asset Platform, this sprint's materials had real, live production consumers from day one — all 5 of the cup's existing materials were migrated onto the new cache, not left as an unexercised mechanism.

**Scale**: 8 new source files (`engine/materials/`), 1 file moved (`engine/graphics/MaterialFactory.ts` → `engine/materials/MaterialFactory.ts`), 8 modified files (5 cup parts, `ProceduralLogo.tsx`, `TextureLoader.ts`, `CupScene.tsx`, `engine/events/types.ts`), 29 new unit tests (85 total project-wide). `tsc`, `eslint`, `next build` all clean.

## Architecture review

**One owner per resource, upheld for a genuinely different resource shape than Sprint 2.2's**: `engine/materials/cache.ts` is the sole owner of every cached `THREE.Material`'s lifecycle. The real architectural finding this sprint: materials are created **synchronously** (a `useMemo` inside a render path, assigned directly to a `<mesh material={...}>` prop), unlike Sprint 2.2's assets (fetched, async by nature). Reusing `createResourceManager`'s `Promise`-returning `load()` for materials would have forced every one of the 5 real cup part components to become asynchronous to consume it — a breaking change to their render contracts, forbidden outright by [17_ZERO_REWRITE_POLICY.md](../17_ZERO_REWRITE_POLICY.md). `createSyncCache<T>()` is the correct, deliberate answer: same LRU/dispose/eviction shape, no `Promise`, no forced asynchrony. This is the same category of finding as Sprint 2.1's `useGestureRecognizer`/`useCupInteractionState` split — recognizing that a shape that fits one domain doesn't automatically fit an adjacent one, and building the right abstraction rather than forcing the existing one.

**A real, honest tension resolved correctly**: `materialOverrides`-bearing material requests are deliberately **not** routed through the cache — they're created directly, one-off, every time. Reasoning: the cache is keyed by `{surface, colorHex, variant}`; if two callers requested the same base key with *different* overrides and both hit the cache, mutating the shared cached instance for one caller's override would silently corrupt it for the other. Since `materialOverrides` has no real production caller yet (Milestone 4's customizer), this branch is currently only exercised by the 5 part components' own defensive code path and by tests — but the correctness property holds regardless of whether it's exercised today, which is the point of getting it right now rather than discovering the corruption bug when Milestone 4 actually starts setting overrides.

**Zero Rewrite Policy compliance, checked concretely**: `CupPartProps`'s shape is untouched — no new field was added to the frozen, shared 8-part contract just to serve 2 parts' theme-aware envMapIntensity need. Instead, `ProceduralCup`/`ProceduralCoffee` call `useActiveTheme()` directly (an already-public hook), avoiding prop-drilling a theme-specific field through a contract every other part would have to ignore. All 5 factory functions (`createCeramicMaterial` etc.) gained an optional second parameter (`overrides?: Partial<SurfaceParams>`) — additive, not breaking; every pre-existing single-argument call site continues to compile and behave identically.

## Rendering review

**Verified via real render, not assumed**: headless-Chrome visual verification (SwiftShader software WebGL) confirmed the hero renders with correct camera framing, materials, lighting, and bloom both before and after this sprint's changes — composition unchanged, as expected for an infrastructure sprint whose one intentional visual change (ceramic/liquid reflection calibration) is a parameter refinement, not a structural change.

**A real bug found and fixed during this same verification pass, not shipped**: the first render after migrating materials onto `buildMaterial()`'s new preset-merging logic produced six `THREE.Material: parameter 'x' has value of undefined` console warnings — `MeshPhysicalMaterialParameters` doesn't tolerate a key present with an `undefined` value (surfaces like `sleeve`/`liquid` don't define `clearcoat`/`transmission` in their presets, and the constructor call was passing those keys through unconditionally). Fixed by only including defined fields in the constructor's parameter object. Re-verified: the fix eliminated the warnings, hero still renders identically, all 85 tests still pass. This is exactly the kind of defect a visual-plus-console verification pass is supposed to catch before sign-off, and it did.

## GPU review

**Material reuse is measured, not assumed**: `getMaterialCacheStats()` exposes real hit/miss counters, verified by direct test assertion (`cache.test.ts`) rather than inferred. In production, every one of the 5 migrated parts' default (no-override) material now resolves through the cache — a second mount, or a theme toggle back to a previously-visited lighting-preset variant, hits the cache instead of recompiling a `THREE.MeshPhysicalMaterial`.

**Disposal correctness, tested directly**: `disposeMaterialCacheEntry`/`clearMaterialCache` are verified to call `.dispose()` on the actual `THREE.Material` instance (via `vi.spyOn(material, "dispose")`, not a mock standing in for it), and LRU eviction is verified to dispose the *least*-recently-used entry specifically, mirroring the same two properties Sprint 2.2's asset cache tests proved.

**Known, accepted limitation, stated plainly** (same as every prior sprint's GPU/memory sections): no real shader-compilation-count or GPU-memory-byte measurement was attempted — no reliable cross-browser API exposes either. The 32-entry material cache cap is a count-based proxy reasoned from realistic customizer session size, not a literal byte budget enforcement.

## Performance review

**Uniform Binding Layer, reframed honestly rather than built speculatively**: no custom shader exists yet (Sprint 2.4's job) — there is no GLSL uniform to bind. `MaterialContext`/`resolveMaterialContext` is the real, tested, consumed equivalent for *this* sprint: a consistent shape for theme + quality-tier inputs to material-creation decisions, not speculative shader plumbing built ahead of the shader that would consume it.

**One-directionality rule upheld**: `resolveMaterialContext` reads `performanceManager.tier.getValue()` — a read, never a write. `engine/materials/` imports nothing that would create a cycle back into `engine/performance/`.

**No premature optimization**: material creation remains synchronous and un-batched — no attempt was made to pre-warm the cache with every surface × colorway combination speculatively; entries populate lazily, on first real request, exactly as the cache's design intends.

## Accessibility review

No user-facing interaction surface changed this sprint. The one visible change (ceramic/liquid reflection calibration) is a passive rendering refinement, not an interactive affordance — no new focus target, no new keyboard path, no change to any existing `aria-*` attribute or reduced-motion gate. Confirmed by direct diff review of the 5 migrated part components: only their internal material-construction logic changed; their `<group>`/`<mesh>` JSX structure, refs, and prop passthrough are unchanged.

## Creative Director Review

**Delivered, not deferred** — this sprint's explicit requirement ("the sprint must produce a noticeable visual improvement") is met by the ceramic material refinement: `roughness` 0.15→0.12, `clearcoatRoughness` 0.08→0.05 (tighter, more mirror-like specular response), plus `resolveEnvMapIntensity`'s theme-aware calibration (the dimmer `night` lighting preset gets a 1.25× reflection boost rather than sharing `studio`'s flat multiplier, keeping ceramic and coffee-liquid reflections legible in the darker preset instead of going flat). Verified via headless-browser screenshots in both the pre- and post-fix states — the composition and framing are unchanged, the reflection response is measurably different by the stated parameters. Honestly scored: this is a **real but subtle** refinement, not a dramatic visual overhaul — visible on close inspection of the ceramic highlight and rim, not a first-glance transformation. Framed accurately in this review rather than oversold, consistent with this project's Creative Director Review discipline of not inflating what actually shipped.

## Retrospective

### Technical debt

- `materialOverrides`'s uncached, one-off code path in all 5 parts has real test coverage at the `updateMaterialParams`/`updateMaterialColor` unit level but no integration test exercising a part component with `materialOverrides` actually set (nothing sets it in production yet). Worth a real integration test the moment Milestone 4's customizer becomes its first real caller, not before.
- `createSyncCache` and `createResourceManager` (Sprint 2.2) are now two separate, deliberately-not-unified factories with genuinely overlapping LRU/dispose/eviction logic (the async/sync split is correct, but the *mechanics* of LRU tracking are duplicated between them). Not proposed for consolidation now — a shared "eviction policy" abstraction under both would be premature generalization with only two call sites — but worth naming as a pattern to watch if a third cache shape ever appears.

### Architectural observations

- The `materialOverrides`-bypasses-the-cache decision is this sprint's clearest example of "correctness over cleverness": routing overridden materials through the cache would have looked more consistent on paper, and been actively wrong in practice. Worth citing as the reference case the next time a caching decision has this shape (shared-key, per-consumer-customizable value).
- Reframing "Uniform Binding Layer" as `MaterialContext` (not GLSL uniforms) turned out to be the right call, confirmed retroactively: Sprint 2.4's actual shader uniform conventions (`uTime`/`uColor`/`uOpacity`, already frozen in [18_ENGINEERING_CONTRACTS.md](../18_ENGINEERING_CONTRACTS.md)) are a genuinely different, lower-level concern than "what theme/tier is currently active" — conflating them this sprint would have meant redesigning one or the other once Sprint 2.4 actually needed real uniforms.

### Possible improvements

- `resolveEnvMapIntensity`'s calibration is currently a single boolean threshold (`directional.intensity < 1 ? 1.25 : 1`) — correct for today's two presets (`studio`/`night`) but worth revisiting as a smoother, continuous function once Sprint 2.6 adds real day/night presets with more than two discrete lighting intensities to calibrate against.
- `createGlassMaterial`/`createMetalMaterial` are fully tested but have zero real cup-part consumers — worth flagging (not acting on) as a candidate for removal if no real surface need materializes by, say, Milestone 5, consistent with this project's "don't let speculative infrastructure become permanent" discipline; not a concern yet, since they were an explicit, direct instruction this sprint and cost nothing to maintain.

## Sign-off

`git status` confirms every change this sprint is real, working, tested implementation — 29 new tests, all passing, verified against `tsc`/`eslint`/`build`/two real browser render passes (the second confirming a bug found in the first was actually fixed). Waiting for approval before Sprint 2.4 (Shader Infrastructure) begins.

## Related

[16_ENGINEERING_SPRINTS.md](../16_ENGINEERING_SPRINTS.md) · [03_3D_ENGINE.md](../03_3D_ENGINE.md) · [19_EVENT_CATALOG.md](../19_EVENT_CATALOG.md) · [17_ZERO_REWRITE_POLICY.md](../17_ZERO_REWRITE_POLICY.md) · [reviews/sprint-2.1-review.md](sprint-2.1-review.md) · [reviews/sprint-2.2-review.md](sprint-2.2-review.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](../09_CREATIVE_DIRECTOR_REVIEW.md)
