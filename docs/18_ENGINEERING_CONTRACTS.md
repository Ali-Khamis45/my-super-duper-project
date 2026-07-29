# 18 — Engineering Contracts

Sprint 0 — **Engineering Contracts**. No production implementation, no rendering features, no shaders, no UI work in this phase. The objective: freeze every public contract before Sprint 2.1 begins. This doc covers Store Contracts, Graphics Contracts, and Shader Contracts, plus the adversarial Review pass across every contract in this set — [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md), [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md), and [20_PLUGIN_API.md](20_PLUGIN_API.md) are the manager/event/plugin contracts, indexed here, not repeated.

## Store contracts

Every Zustand store, current and planned, frozen the same way managers are. Two kinds already established and re-stated as a hard rule: **a store is continuous state** (`useValue`-style reactive read, no history) — if something needs discrete "it happened" semantics, it's an [EventBus event](19_EVENT_CATALOG.md), never a store.

### `ui-store` (existing)

| | |
|---|---|
| Responsibilities | Ephemeral, client-only UI chrome state: nav open/closed, dev-panel visibility, manual theme override |
| Selectors | `useNavOpen()`, `useDevPanelVisible()`, `useThemeOverride()` |
| Actions | `toggleNav()`, `toggleDevPanel()`, `setThemeOverride(theme)` |
| Persistence | None — resets on reload, deliberately (nav/dev-panel state has no reason to survive a refresh) |
| Future extensions | Additive selectors only, e.g. a future mobile-menu-specific flag — never a restructure of existing selector names |

### Dev-stats bridge store (existing, migrates onto `createBridgeStore<T>`)

| | |
|---|---|
| Responsibilities | FPS + `gl.info` render stats, written every ~500ms from inside the `Canvas`, read by `DevPanel` outside it |
| Selectors | `useValue()` (DOM `DevPanel`), `getValue()` (unused today, available for a future in-Canvas consumer) |
| Actions | `setValue(stats)` |
| Persistence | None — dev-only, in-memory |
| Future extensions | Gains a `qualityTier` field once the Performance Manager exists (Sprint 2.5) — additive, not a restructure |

### Keyboard-rotation bridge store (existing, migrates onto `createBridgeStore<T>`)

| | |
|---|---|
| Responsibilities | A rotation delta written by `useCupKeyboardTrigger` (DOM keydown) and drained every frame by `useCupInteractionState` (inside the R3F tree) |
| Selectors | `getValue()` (drained and reset to 0 each frame — this store's read is destructive by design, unlike every other bridge store, and that asymmetry is deliberate: it's a delta queue, not a level value) |
| Actions | `setValue(delta)` (additive — a second keypress before the frame drains accumulates, doesn't overwrite) |
| Persistence | None |
| Future extensions | None anticipated — this store's shape is narrow and complete for its one job |

### `scrollProgress` bridge store (Implemented, Sprint 3.7 — designed Sprint 2.1)

| | |
|---|---|
| Responsibilities | `0-1` scroll progress written from `ScrollTrigger.onUpdate` (`features/storytelling/hooks/useScrollTimeline.ts`), read reactively by DOM narrative components |
| Selectors | `useValue()`, `getValue()` |
| Actions | `setValue(progress)` |
| Persistence | None |
| Real deviation from the original design | Not read imperatively by `CameraRig` as this contract originally sketched — Sprint 3.7's actual brief ("Do not modify Camera contracts") ruled that out; `features/storytelling/` reads this store itself and drives `CameraRig` only through its existing, unmodified `preset` prop instead. See [26_API_STABILITY.md](26_API_STABILITY.md)'s `CameraPathName` row for the full reasoning. |
| Future extensions | A future multi-section narrative may need a second, section-scoped progress value alongside the global one — that's a **second** `createBridgeStore` instance (`sectionProgress`), never an overload of this one's meaning. `storytelling-store.ts`'s `chapterProgress` field covers this need for `/story` itself, as a plain Zustand field rather than a second bridge store — but see the Sprint 3.8 correction below, this row's original reasoning for that choice was wrong. |
| **Sprint 3.8 correction** | The claim above ("chapter changes are discrete/infrequent enough that a bridge store's no-re-render escape hatch wasn't needed") is true of `activeChapterId`, but was **wrong** for `chapterProgress` itself — that field updates on every GSAP scroll tick, not discretely, and Sprint 3.8's audit found `StoryCanvas.tsx` subscribing to it unconditionally was re-rendering the entire 3D scene tree every scroll frame for all 7 chapters. Fixed not by adding a second bridge store, but by narrowing the Zustand selector itself (`StoryCanvas` now derives a value that only changes when the active chapter genuinely needs continuous progress) — a smaller, more local fix than the bridge-store escape hatch this row originally anticipated needing. See [reviews/sprint-3.8-review.md](reviews/sprint-3.8-review.md). |

### Customizer store (future, Milestone 4 — designed now per [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) scenario 4, not built)

| | |
|---|---|
| Responsibilities | Current in-progress drink configuration: selected colorway, ingredients, size, temperature |
| Selectors | `useSelectedColorway()`, `useSelectedIngredients()`, `useSize()`, `useTemperature()` |
| Actions | `setColorway(key)`, `toggleIngredient(id)`, `setSize(size)`, `setTemperature(temp)`, `resetToProduct(product)` (Product Switching's rehydration entry point, per [20_PLUGIN_API.md](20_PLUGIN_API.md)) |
| Persistence | Session-only at first (no cross-visit cart persistence needed until Milestone 8 makes it a cart item) |
| Future extensions | `resetToProduct` is the seam Milestone 8's cart adds onto — never a reason to touch the selectors above |

### Cart store (Implemented, Sprint 3.6 — built to this exact pre-designed shape, extended for the sprint's much richer brief)

| | |
|---|---|
| Responsibilities | Items added from the customizer (as full `RecipeSnapshot`s, not a reference back to live state — see `features/cart/types.ts`), quantities, running total, session favorites, the last completed order |
| Selectors | `selectCartItemCount(items)`, `selectCartTotal(items)` (plain functions over `items`, not store-bound hooks — `useCartStore((s) => s.items)` plus these keeps `PriceBreakdown`'s totals `useMemo`-able per the brief's own "memoize derived totals" requirement, rather than baking memoization into the store itself) |
| Actions | `addItem(snapshot, quantity?)` (merges into an existing identical recipe rather than duplicating — see `stores/cart-store.ts`'s `isSameRecipe`), `removeItem(id)`, `updateQuantity(id, quantity)`, `reorderItem(id, direction)`, `clear()`, `toggleFavorite(snapshot)`, `addFavoriteToCart(id)`, `placeOrder()` — a real, larger action set than this table's original 3-action sketch, additive for this sprint's real "Quantity Editing"/"Favorites"/"Checkout Flow" requirements, not a rewrite of the sketch's intent |
| Persistence | `localStorage`-backed, exactly as designed here at the Architecture Freeze — the one deliberate difference from every other feature store in this project (`customizer-store`/`concierge-store` are both `sessionStorage`) |
| Future extensions | `RecipeSnapshot`'s own doc comment names "linking orders to the account for future use" as a real, enabled-but-not-built capability — the model is durable and self-contained enough for a future auth/order-history feature to consume directly, no reshaping needed |

## Graphics contracts

Frozen rules, not re-derivation — full rationale already lives in [03_3D_ENGINE.md](03_3D_ENGINE.md) and [3d-asset-pipeline.md](3d-asset-pipeline.md); this section states the *contract* each asset/consumer must satisfy.

| Domain | Contract |
|---|---|
| **Geometry** | Y-up, real-world meters, authored against the procedural cup's existing unit space (~1.6 units tall) so camera presets and material scale never need re-tuning when a part swaps from procedural to modeled. Every part is a `forwardRef<Group, CupPartProps>` — no part may return anything but a `Group` ref, a contract already enforced by the `CupPartComponent` type. |
| **Materials** | Always produced by `MaterialFactory`/`IMaterialManager`, never authored inline at a call site and never sourced from a GLB's baked materials (see the mesh-swap contract clarification in [3d-asset-pipeline.md](3d-asset-pipeline.md)). Color is always a parameter derived from OKLCH design tokens via `oklchToSrgb` — never a hardcoded RGB literal, never `THREE.Color.setStyle()` on an OKLCH string (the Milestone 1 incident this rule exists to prevent). |
| **Textures** | ORM-packed where applicable, capped at 2K, KTX2/Basis Universal for every real image asset, no exceptions once real textures exist. Canvas-generated runtime textures (logo, gradients) are exempt — they're procedural, not files. |
| **GLB assets** | `.glb` only (never split `.gltf`+`.bin`+textures), kebab-case path `public/models/<part>/<part>.glb`, Draco-compressed geometry by default (Meshopt reserved for high-object-count scenes per [ADR-0009](adr/0009-asset-compression-pipeline.md)), loaded exclusively through the Asset Manager's shared `GLTFLoader` instance — never a second ad hoc `GLTFLoader` constructed at a call site. |
| **HDRI** | `.hdr` or pre-converted `.exr` under `public/hdri/<name>.hdr` when self-hosted; drei presets otherwise. Every environment resolves through `IEnvironmentManager.resolve()` — never a bare `<Environment preset="...">` at a call site outside that resolution path, which would bypass the registry entirely. |
| **Effects** | `EffectConfig` discriminated union only — no boolean prop soup (`bloom?: boolean`, `vignette?: boolean`, ...) ever re-enters `EffectsStack`'s prop surface. Post-processing order is fixed: render (incl. tone mapping) → screen-space reflections (if ever used) → Bloom → DOF → Vignette → Chromatic Aberration → Noise/grain. |
| **Environment** | Selected via `IEnvironmentManager`/`ILightingManager`, independently of each other and independently of UI theme — never a single combined lookup table re-coupling the two axes the Milestone 2 split exists to separate. |

## Shader contracts

Building on [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md)'s design; this section is the frozen, literal convention every shader — steam through whatever ships in Milestone 10 — must follow without re-deciding it.

### Uniform naming convention

| Uniform | Type | Meaning | Required in |
|---|---|---|---|
| `uTime` | `float` | Elapsed seconds, monotonic, supplied by the consuming component from `useFrame`'s clock — never `Date.now()` (not frame-rate-independent-safe across tab backgrounding) | Every animated shader |
| `uColor` | `vec3` | Linear-sRGB color (see Color spaces below), sourced from `ColorSchemes`'s `oklchToSrgb`, never a literal | Every shader with a themeable color |
| `uOpacity` | `float` | `0-1`, composed with reduced-motion/fade logic upstream, not hardcoded per-shader | Any shader supporting fade-in/out |
| `uTiltAngle`, `uRippleOrigins[]`, etc. | Shader-specific | Named descriptively, `camelCase`, prefixed `u` | Coffee/foam only, per [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md) |

A new shader may add new shader-specific uniforms freely; it may not redefine what `uTime`/`uColor`/`uOpacity` mean.

### Shared utilities

`engine/shaders/common/` is the only place vendored/shared GLSL snippets live. A shader family imports from it; it never copy-pastes noise/remap logic inline. Exports:

- `noise.ts` — `noise2D(uv)`, `noise3D(pos)` (Ashima Arts' webgl-noise, MIT-licensed, vendored as string exports) — naming is fixed so every shader calls the same two functions, never a per-shader reimplementation.
- `remap.ts` — `remap(value, inMin, inMax, outMin, outMax)`, standard ease curves as string exports.
- `uniforms.ts` — helpers for injecting design-token-derived uniforms (`buildColorUniform(oklchToken)`), so no shader hand-writes the OKLCH→linear-sRGB conversion itself.

### Time handling

`uTime` is owned by the **consuming component**, not the shader material itself — each part's `useFrame` callback increments and passes its own local time value. This is deliberate: a shared global clock would couple every shader instance's animation phase together (every steam wisp pulsing in lockstep looks robotic); per-instance local time, optionally offset by a random per-instance seed, is what makes repeated instances (future particle systems) read as organic rather than obviously cloned.

### Color spaces — the rule that prevents a second version of the Milestone 1 OKLCH bug

Three.js's shader pipeline operates in **linear color space internally**; the renderer handles the final linear→sRGB output conversion (`THREE.SRGBColorSpace` on the canvas output). Every `uColor` uniform a shader receives must already be **linear**, produced by `oklchToSrgb` (which returns linear-sRGB, not the display-encoded sRGB a CSS string would give you) — never pass a raw OKLCH triple or a gamma-encoded color into a shader uniform and expect Three's pipeline to correct it. This is the shader-side version of the exact bug class that broke every material's color in Milestone 1 before its fix; stated explicitly here so it can't recur in shader form.

### Naming & folder conventions

Fixed by [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md), restated as a frozen contract: `engine/shaders/<family>/<Family>Material.ts` (drei `shaderMaterial()` + `extend()`), `<family>.vert.ts`, `<family>.frag.ts`, template-string source (never `.glsl` files, per [ADR-0008](adr/0008-shader-authoring-approach.md)'s Turbopack-loader-ecosystem reasoning). A new shader family is a new folder satisfying this exact shape — see [20_PLUGIN_API.md](20_PLUGIN_API.md).

## Review — attempting to break every contract above

Six real issues found. All resolved here, in design docs only.

1. **`MaterialCacheKey` as a free-form string would have been a leaky abstraction.** An earlier draft of [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) considered a plain `string` cache key — nothing would stop two call sites colliding on the same string with different intended materials (e.g. two different features both computing `"ceramic-#8B5E34"` by coincidence, for genuinely different surfaces). **Fixed**: `MaterialCacheKey` is a structured type (`{ surface, colorHex, variant? }`), already reflected in [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) — hashed internally by the manager, never hand-constructed as a string by a caller.

2. **`IAnalyticsManager` and `IEventBus` had unclear responsibility boundaries.** Both are "something happened, tell interested parties" mechanisms; without a stated line, a future contributor could plausibly route a cross-manager coordination signal through Analytics or a user-reporting concern through the EventBus. **Fixed**: EventBus is internal/typed/synchronous cross-manager coordination; Analytics is external reporting, allowed to be async, allowed to drop events under sink backpressure. Where an occurrence matters to both, Analytics subscribes to the relevant EventBus event and translates it — never one mechanism standing in for the other. Reflected in [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md)'s `IAnalyticsManager` entry.

3. **A naming-driven implicit dependency in the Interaction Manager.** Pointer-normalization math (`normalizePointer`) currently lives in `engine/motion/gestures.ts` — meaning `engine/interaction/` (a Milestone 2 module) would implicitly depend on `engine/motion/` (framed as animation timing) for what's actually pure coordinate math, not motion. Not a real coupling problem today (both are engine-layer, no cycle), but a naming trap for a future contributor deciding where new pointer-handling logic belongs. **Resolved as a flagged, deferred refactor**: when Sprint 2.1 actually builds `useGestureRecognizer`, `normalizePointer` should move to `engine/interaction/normalizePointer.ts` (or a neutral `engine/shared/` location) — a rename/move, zero behavior change, correctly scoped to implementation time, not this design-only phase.

4. **Circular-dependency re-check**: the Performance Manager one-directionality rule ([15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)) is re-verified against every interface in [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) — confirmed no manager's public interface requires importing Performance Manager's internals beyond reading its exported `tier` bridge store. No new cycle introduced by this Sprint 0 pass.

5. **Versioning issue, resolved as intentional non-abstraction**: EventBus payloads have no version field. Considered and rejected — [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) already forbids breaking payload changes to an existing event name; the one legitimate escape hatch (a genuinely unavoidable breaking change) ships as a new event name, not a version-bumped payload. Adding a version field now would be speculative abstraction for a case the policy already resolves a simpler way.

6. **Unclear responsibility between Shader Manager and Effect Manager for "glow."** [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md) already disambiguates Bloom (global, post-process, Effect Manager) from a targeted per-object glow shader (Shader Manager) — re-confirmed here as still correct and non-overlapping after formalizing both as typed interfaces; no change needed, recorded as a check that passed rather than a silent skip.

No manager interface, event, store, or shader convention required a breaking redesign — every finding above was either a type-safety tightening (found before it shipped, not after) or a documented, deferred, correctly-scoped refactor note. That's the outcome a Sprint 0 freeze is supposed to produce.

## Related

[22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) · [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md) · [20_PLUGIN_API.md](20_PLUGIN_API.md) · [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md) · [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) · [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md) · [3d-asset-pipeline.md](3d-asset-pipeline.md)
