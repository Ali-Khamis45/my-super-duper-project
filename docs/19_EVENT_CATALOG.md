# 19 — Event Catalog

Sprint 0 deliverable. The complete `EventBus` event catalog, frozen before implementation. Every event a manager or feature will ever emit through `engine/events/EventBus.ts` is named and typed here first — adding an event later means adding a row to this table and a union member to `AppEvent`, never inventing an ad hoc emit call at the point of need.

## EventBus contract, once, for every event below

- **Ordering**: synchronous, in-subscription-order. `emit()` calls every current subscriber before returning; there is no queue, no microtask deferral.
- **Failure handling**: each subscriber is invoked inside a try/catch internal to the bus. A throwing subscriber is logged and does not prevent later subscribers from running, and does not propagate to the emitter — one broken listener cannot break the manager that emitted the event.
- **No replay**: a subscriber added after an event already fired never receives it (no event sourcing/history). Anything that needs "the current value, even for a late subscriber" is a **bridge store** (continuous state), not an EventBus event — this is the same continuous-state-vs-discrete-event line drawn throughout [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) and [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md).
- **Future compatibility**: payloads only ever grow by adding optional fields, never by changing or removing an existing field's meaning — the same rule as [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md). A genuinely breaking payload change ships as a new event name, never a version-bumped payload on the same name.

```ts
type AppEvent =
  | { name: "asset:loading"; key: string }
  | { name: "asset:loaded"; key: string; durationMs: number }
  | { name: "asset:load-failed"; key: string; reason: string }
  | { name: "asset:timeout"; key: string; elapsedMs: number }
  | { name: "asset:disposed"; key: string }
  | { name: "resource:evicted"; key: string }
  | { name: "material:created"; key: string }
  | { name: "material:updated"; key: string }
  | { name: "material:disposed"; key: string }
  | { name: "theme:materials-updated"; to: ThemeName }
  | { name: "shader:compiled"; shader: string }
  | { name: "shader:failed"; shader: string; error: string }
  | { name: "camera:transition-start"; from: CameraPresetName | null; to: CameraPresetName }
  | { name: "camera:transition-complete"; preset: CameraPresetName }
  | { name: "theme:changed"; to: ThemeName }
  | { name: "lighting:changed"; preset: LightingPresetName }
  | { name: "performance:tier-changed"; tier: QualityTier; previous: QualityTier }
  | { name: "interaction:started"; gesture: GestureType; pointerKind: PointerKind }
  | { name: "interaction:ended"; gesture: GestureType; durationMs: number }
  | { name: "cup:rotated"; degrees: number; method: "drag" | "touch" | "keyboard" }
  | { name: "ingredient:dropped"; ingredientId: string; targetSlot: string }
  | { name: "scene:ready"; route: string }
  | { name: "webgl:context-lost" }
  | { name: "webgl:context-restored" }
  | { name: "ai:recommendation-ready"; recommendationId: string }
  | { name: "checkout:started"; cartTotal: number }
  | { name: "checkout:completed"; orderId: string };
```

## Catalog

| Event | Payload | Source | Consumers | Ordering guarantee | Failure handling | Future compatibility |
|---|---|---|---|---|---|---|
| `asset:loading` | `{ key }` | **Implemented, Sprint 2.2** — the GLB pipeline (`engine/assets/glb.ts`) and texture pipeline (`textures.ts`), at the start of `loadModel`/`loadTexture`/`preload*` | Debug overlay (future loading-state display) | Fires once per `load()`/`preload()` call, before the underlying fetch begins | N/A | — |
| `asset:loaded` | `{ key, durationMs }` | **Implemented, Sprint 2.2** — same two pipelines, on success | Debug overlay (load timing), Analytics (optional) | Always after the corresponding `load()` promise resolves, before that promise's `.then()` runs (bus emits synchronously inside the resolution handler) | N/A — success path | Add fields (e.g. `sizeBytes`) additively |
| `asset:load-failed` | `{ key, reason }` | **Implemented, Sprint 2.2** — same two pipelines. `loadModel`/`loadTexture` never throw to their own caller; the caller receives `{ status: "fallback" }` and the registry renders the `procedural` implementation, per the mesh-swap contract | Registry fallback logic (swap to `procedural`), Analytics | Fires once per failed attempt, before the `load()` promise rejects | Consumers must not throw; a failed fallback swap is a bug in the consumer, not the bus's problem | `reason` stays a string, not a typed error union — keeps this event stable as failure causes grow |
| `asset:timeout` | `{ key, elapsedMs }` | **Implemented, Sprint 2.2** — `createResourceManager`'s internal race against `timeoutMs` (default 10s) | Same as `asset:load-failed` — timeout is treated as a load failure downstream | Fires once, mutually exclusive with `asset:loaded` for the same key/attempt | Same as above | — |
| `asset:disposed` | `{ key }` | **Implemented, Sprint 2.2** — `createResourceManager`'s `dispose()`/`clear()`, and the disposal side of `replace()` (hot-replacement) and LRU eviction | Debug overlay (future), Analytics | Fires once per released value — explicit dispose, route-level `clear()`, an evicted entry, or the old value in a hot-replacement | N/A | — |
| `resource:evicted` | `{ key }` | **Implemented, Sprint 2.2** — `createResourceManager`'s LRU cap (24 entries for textures, 8 for GLBs — a count-based proxy for [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md)'s byte budgets, not a literal measurement) | Debug overlay (future cache-pressure indicator), Analytics | Fires only when the cap is actually exceeded, distinct from an explicit `dispose()` — this is cache-pressure-driven, not caller-driven | N/A | Distinct from `asset:disposed`, which also fires alongside it — `resource:evicted` signals *why* (cache pressure), `asset:disposed` signals *that* the value was released |
| `material:created` | `{ key }` | **Implemented, Sprint 2.3** — `engine/materials/cache.ts`'s `getOrCreateMaterial`, on a real cache miss only | Debug overlay (future), Analytics | Fires once per compiled `THREE.Material`, never on a cache hit | N/A | — |
| `material:updated` | `{ key }` | **Implemented, Sprint 2.3** — `updateMaterialParams`, an in-place mutation of an already-cached material (no new object, no disposal) | Debug overlay (future) | Fires once per `updateMaterialParams` call | N/A | — |
| `material:disposed` | `{ key }` | **Implemented, Sprint 2.3** — `disposeMaterialCacheEntry`, `clearMaterialCache`, or the material cache's own LRU eviction (32-entry cap) | Debug overlay (future), Analytics | Fires once per released `THREE.Material` | N/A | Distinct from `asset:disposed` — materials are compiled GPU objects, assets are files; conflating them would force every consumer to filter by a discriminant instead of subscribing to the one it needs, the same reasoning as `resource:evicted` vs `asset:disposed` above |
| `theme:materials-updated` | `{ to }` | **Implemented, Sprint 2.3** — `engine/materials/themeBridge.ts`'s `notifyThemeMaterialsUpdated`, called from `CupScene` on a real theme change | Debug overlay (future), Analytics | Fires once per *distinct* theme change, never on a repeated call with the same theme | N/A | A batch summary signal, not a duplicate of the individual `material:created`/`-updated` events the theme change may also trigger per material |
| `shader:compiled` | `{ shader }` | Shader Manager (material factory, on successful first compile) | Debug overlay | Best-effort — Three.js compiles lazily on first render, so this fires on first frame a material is actually used, not on construction | N/A | — |
| `shader:failed` | `{ shader, error }` | Shader Manager | Consumer swaps to the pre-shader fallback material (see [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) failure-mode table), Analytics | Fires once per detected compile failure | Fallback swap logic lives in the part component, not the bus | `error` stays a string (driver/browser error text varies too much to type meaningfully) |
| `camera:transition-start` | `{ from, to }` | Camera Manager (`CameraRig`) | Interaction Manager (suppress free drag-rotate during a path-driven transition, per freeze scenario 7) | Fires exactly once per transition, before interpolation begins | N/A | — |
| `camera:transition-complete` | `{ preset }` | Camera Manager | Interaction Manager (re-enable free drag-rotate), Debug overlay | Fires exactly once per transition, guaranteed after `camera:transition-start` for the same transition | N/A | — |
| `theme:changed` | `{ to }` | Theme Engine (`next-themes` change) | Environment/Lighting Manager (theme→preset lookup), Analytics | Fires on every theme toggle, including system-preference-driven changes | N/A | — |
| `lighting:changed` | `{ preset }` | Lighting Manager, either via `theme:changed` or a direct preset selection (e.g. a future Checkout mood) | Debug overlay | Fires whenever the resolved `LightingPresetName` actually changes — not on every `theme:changed`, since two themes could map to the same lighting preset | N/A | — |
| `performance:tier-changed` | `{ tier, previous }` | Performance Manager | Effect/Shader/Material Managers (read-only reaction, not a subscription — see the one-directionality rule in [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md); in practice these read the tier bridge store directly rather than subscribing to this event, which exists primarily for Debug/Analytics visibility) | Fires only on an actual tier step, never on every FPS sample | N/A | — |
| `interaction:started` / `interaction:ended` | `{ gesture, pointerKind }` / `{ gesture, durationMs }` | Interaction Manager, derived from its own `GestureEvent` stream (`started` on `drag-start`/`hover-start`/`tap`/`press-hold`, `ended` on `drag-end`/`hover-end`) — a coarser, EventBus-level signal, distinct from the raw per-phase `GestureEvent` stream consumers subscribe to directly via `useGestureRecognizer`'s handler map (see [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md)) | Analytics, any feature wanting generic gesture telemetry without caring what the gesture meant | `ended` always follows `started` for the same gesture instance; no interleaving of two `started` events for the same pointer without an intervening `ended` | N/A | — |
| `cup:rotated` | `{ degrees, method }` | `hero-cup` feature (interprets raw gestures from Interaction Manager — **not emitted by the Interaction Manager itself**, since it's cup-specific semantics, not generic gesture data) | Analytics (translates to `hero_cup_rotated`) | Fires on rotation completion (release), not continuously during drag | N/A | — |
| `ingredient:dropped` | `{ ingredientId, targetSlot }` | Ingredient Builder feature (Milestone 5), interpreting Interaction Manager's raw `drag`/drop gestures | Cup assembly (attach ingredient), Analytics, Audio (drop sound, once `audio/` exists) | Fires once per successful drop; an invalid drop (missed target) never emits this | Consumers that fail to attach the ingredient are a feature bug, not a bus concern | — |
| `scene:ready` | `{ route }` | Scene composition root, after its first successful frame render | Debug overlay, Analytics (time-to-interactive proxy) | Fires exactly once per route mount | N/A | — |
| `webgl:context-lost` | `{}` | **Implemented, Sprint 2.1** — `features/hero-cup/hooks/useWebGLContextRecovery.ts`, a dedicated hook distinct from `useWebGLSupport` (which only probes availability once, at load) | Scene composition root (swap to `CupStaticFallback`), Analytics | Fires on the browser's native `webglcontextlost` event | Listener must call `event.preventDefault()` before this emits, or restoration becomes impossible | — |
| `webgl:context-restored` | `{}` | Same listener | Scene composition root (re-mount the Canvas) | Fires on the browser's native `webglcontextrestored` event, only if `context-lost`'s handler allowed restoration | N/A | — |
| `ai:recommendation-ready` | `{ recommendationId }` | AI Barista feature (Milestone 7), after its data-fetch resolves | Camera Manager (switch to `ai` preset reveal), Customizer store (apply recommended colorway) | Fires once per completed recommendation flow | Consumer failure to apply the recommendation is a feature bug | — |
| `checkout:started` | `{ cartTotal }` | Commerce feature (Milestone 8) | Analytics | Fires once per checkout flow entry | N/A | — |
| `checkout:completed` | `{ orderId }` | Commerce feature | Confetti/celebration effect (DOM-layer, per the Effect Manager scope boundary in [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md)), Analytics | Fires once per completed order | N/A | — |

## What deliberately has no event

Continuous values — scroll progress, current quality tier's *raw* FPS samples, mouse parallax position, customizer color selection while actively dragging a slider — are bridge stores or Zustand stores, not events, per the continuous-state-vs-discrete-event rule. Emitting an event on every `useFrame` tick would be a real performance bug (60+ emits/sec fanning out to every subscriber), not just a style violation.

## Related

[22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) · [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md) · [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md)
