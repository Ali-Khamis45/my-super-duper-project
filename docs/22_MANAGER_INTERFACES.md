# 22 — Manager Interfaces

Sprint 0 deliverable. Freezes the public contract of every manager designed in [milestone-2-architecture-rfc.md](milestone-2-architecture-rfc.md), [03_3D_ENGINE.md](03_3D_ENGINE.md), and [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md), before any of it is implemented. No production code changes — this is [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)'s design made literal and typed.

**A note on "interface" in this codebase**: this project is functional/hook-based, not class-based OOP — see [06_CODING_STANDARDS.md](06_CODING_STANDARDS.md). "`IFooManager`" below names a **contract**: the exact shape of exported functions/types a module must provide. Nothing here implies a `class FooManager implements IFooManager`. Where a manager is stateful, it's a module-level singleton (the registry pattern) or a Zustand store (continuous state) — never a `new`-able class, consistent with everything shipped in Milestone 1.

Every entry: Responsibilities · Public interface (TS) · Events · Lifecycle · Ownership · Dependencies · Extension points. Dependencies are checked against [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)'s dependency graph — none introduce a new edge that graph doesn't already account for.

---

## Scene composition — no `ISceneManager`

**This is deliberate, not a missing entry.** Per [ADR-0006](adr/0006-scene-management-strategy.md), reaffirmed by [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) (none of 12 stress-tested scenarios needed cross-route scene morphing), there is no persistent, cross-route Scene Manager. What exists instead is a per-route **composition contract** every scene root (`CupScene.tsx` today, others later) satisfies:

```ts
interface SceneCompositionRoot {
  readonly route: string;
  camera: CameraPresetName;
  environment: EnvironmentPresetName;
  lighting: LightingPresetName;
  effects: EffectConfig[];
}
```

**Lifecycle**: created when its `<Canvas>` mounts, torn down (and its WebGL context released) when it unmounts — no state survives a route change, by design.
**Ownership**: the route's page component.
**Dependencies**: Camera, Environment, Lighting, Effect Managers (composes them; owns none of their state).
**Extension points**: a new route is a new composition root satisfying the same shape — nothing shared changes.

## `ICameraManager`

**Responsibilities**: resolve named camera presets/paths to concrete position/fov/lookAt state; drive the active camera each frame (damped preset-follow, or path interpolation during scroll storytelling).

```ts
type CameraPresetName = "hero" | "product" | "checkout" | "ai" | "ingredient" | "exploded";
type CameraPathName = string; // populated starting Milestone 6

interface CameraPresetDefinition {
  position: [number, number, number];
  fov: number;
  lookAt: [number, number, number];
}

interface CameraPathDefinition {
  keyframes: CameraPresetDefinition[];
  labels?: Record<string, number>; // named progress points, e.g. { "exploded": 0.6 }
}

interface ICameraManager {
  resolvePreset(name: CameraPresetName): CameraPresetDefinition; // throws if unregistered
  resolvePath(name: CameraPathName): CameraPathDefinition;       // throws if unregistered
  registerPreset(name: CameraPresetName, def: CameraPresetDefinition): void;
  registerPath(name: CameraPathName, def: CameraPathDefinition): void;
}

// Runtime component contract — as actually shipped (Sprint 3.8 docs-sync
// fix; corrected against `engine/camera/CameraRig.tsx`'s real prop shape,
// which diverged from this sketch without the doc being updated).
// `path`/`CameraPathName` were never built — Sprint 3.7's `/story` brief
// explicitly said "implement through new presets only," and `CameraRig`
// only resolves its preset once per React render (not per-frame), so a
// continuously-scrubbed `path` prop as sketched here would need a real,
// separate design pass this project has deliberately not spent yet. See
// docs/26_API_STABILITY.md's `CameraPathName` row for the full reasoning.
interface CameraRigProps {
  preset: CameraPresetName;
  parallaxSource?: RefObject<{ x: number; y: number }>; // was documented as `parallax?: boolean`
  parallaxStrength?: number;
  enabled?: boolean; // false under reduced motion: snap once, no drift
  transitionDamping?: number; // was documented as `transitionDuration?: number` — a damping constant, not a duration
  // Sprint 3.9, Task 2 — an optional continuous distance multiplier (1 =
  // the preset's own authored distance), read imperatively via
  // `.getValue()` inside `useFrame` (same ref-not-prop reasoning as
  // `parallaxSource`). `undefined` for every pre-3.9 caller, so zoom stays
  // pinned at 1 — byte-for-byte unchanged behavior when omitted. The
  // sanctioned additive-prop extension mechanism, not a new camera
  // implementation — see `features/hero-cup/hooks/useCupZoomControls.ts`.
  zoomSource?: BridgeStore<number>;
}
```

**Events emitted**: `camera:transition-start`, `camera:transition-complete` (real, emitting since Sprint 2.1).
**Lifecycle**: registry populated at module load (static); `CameraRig` instance lifecycle matches its scene composition root.
**Ownership**: registry is a module-level singleton; one `CameraRig` instance per scene composition root.
**Dependencies**: Registry factory (`createPartRegistry`-shaped), `scrollProgress` bridge store (read-only, imperative), EventBus (emit only).
**Extension points**: `registerPreset`/`registerPath` — no change to `CameraRig`'s resolution logic.

## `IEnvironmentManager` / `ILightingManager`

**Responsibilities**: resolve named environment (HDRI source + intensity) and lighting (ambient/directional intensity, position, bloom params) presets, independently of each other and independently of light/dark UI theme.

```ts
type EnvironmentPresetName = string; // "studio" | "night" today; day/night variants land Sprint 2.6
type LightingPresetName = string;

interface EnvironmentPresetDefinition {
  source: { type: "drei-preset"; name: string } | { type: "file"; path: string };
  intensity: number;
}

interface LightingPresetDefinition {
  ambient: { intensity: number };
  directional: { intensity: number; position: [number, number, number] };
  bloom: { intensity: number; threshold: number };
}

interface IEnvironmentManager {
  resolve(name: EnvironmentPresetName): EnvironmentPresetDefinition;
  register(name: EnvironmentPresetName, def: EnvironmentPresetDefinition): void;
}
interface ILightingManager {
  resolve(name: LightingPresetName): LightingPresetDefinition;
  register(name: LightingPresetName, def: LightingPresetDefinition): void;
}

// The thin bridge that replaces today's single LightingThemes.ts
type ThemeToPresetMap = Record<ThemeName, { environment: EnvironmentPresetName; lighting: LightingPresetName }>;
```

**Events**: `lighting:changed`, `theme:changed` (existing) triggers a `ThemeToPresetMap` lookup, not a hardcoded branch.
**Lifecycle**: registries populated at module load; resolved value read per-render by the scene composition root.
**Ownership**: two independent module-level singletons — deliberately not merged into one, since they vary on independent axes (see [03_3D_ENGINE.md](03_3D_ENGINE.md)).
**Dependencies**: Registry factory, Theme Engine (`useActiveTheme`).
**Extension points**: register a new preset (e.g., a "golden hour" lighting mood) — zero change to either resolver.

## `IMaterialManager`

**Responsibilities**: produce and cache `THREE.Material` instances keyed by surface type + resolved parameters, so repeated requests (e.g., a customizer trying colors) reuse compiled materials instead of reallocating.

```ts
interface MaterialCacheKey {
  surface: "ceramic" | "liquid" | "foam" | "sleeve" | "lid";
  colorHex: string;
  variant?: string; // e.g. a finish name, additive-only as new surface options appear
}

interface IMaterialManager {
  getOrCreate(key: MaterialCacheKey, factory: () => THREE.Material): THREE.Material;
  invalidate(key: MaterialCacheKey): void;
  clear(): void; // full sweep, e.g. on leaving the customizer route
  // Sprint 3.8 docs-sync fix — real, shipped, additive growth beyond this
  // original sketch (`engine/materials/cache.ts`), never reflected here:
  updateMaterialParams(material: THREE.Material, surface: string, params: object): void;
  updateMaterialColor(material: THREE.Material, color: THREE.Color): void;
  materialCacheKeyToString(key: MaterialCacheKey): string;
  getMaterialCacheStats(): { size: number; hits: number; misses: number };
}
```

**Note**: `MaterialCacheKey` is a structured type, not a free-form string — see [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md)'s Review section for why a raw string key was rejected during this pass.
**Events (Sprint 3.8 docs-sync fix)**: `material:created`/`material:updated`/`material:disposed` — real, emitting, documented in [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md); this row's original "none — pure cache" was written before those shipped and was never updated.
**Lifecycle**: cache is a module-level `Map`, capped and LRU-evicted (~50 entries), lives for the session.
**Ownership**: module-level singleton, shared by every scene composition root (materials aren't route-scoped — a color compiled on the hero route is still valid if requested again elsewhere).
**Dependencies**: Theme Engine (color resolution), Performance Manager (read-only: tier may cap max resolution/complexity of generated materials).
**Extension points**: a new `surface` union member + its factory function — `getOrCreate`'s logic never changes.

## `ITextureManager`

**Responsibilities**: same caching discipline as materials, plus lazy KTX2 transcoding once real compressed textures exist.

```ts
interface ITextureManager {
  getOrCreate(key: string, factory: () => THREE.Texture): THREE.Texture;
  loadCompressed(url: string): Promise<THREE.Texture>; // KTX2Loader, constructed lazily on first call
  clear(): void;
}
```

**Events**: `asset:loaded` / `asset:load-failed` (shared with Asset Manager — texture loads are asset loads).
**Lifecycle**: cache is a module-level `Map`; `KTX2Loader` constructs once, lazily, the first time it's needed (requires a live `WebGLRenderer` reference, unavailable at module-load time).
**Ownership**: module-level singleton.
**Dependencies**: Asset Manager (shares the loader-construction pattern), Performance Manager (read-only: tier may cap max texture resolution requested).
**Extension points**: none needed beyond `getOrCreate`/`loadCompressed` — texture *sources* vary, the manager's shape doesn't.

## `IAssetManager`

**Responsibilities**: own the shared `GLTFLoader` (+ `DRACOLoader` + `MeshoptDecoder`) instance; resolve asset keys to versioned paths via the manifest; enforce load timeouts.

```ts
interface AssetManifestEntry { path: string; version: string; }

interface IAssetManager {
  getGLTFLoader(): GLTFLoader; // singleton, configured once
  resolve(key: string): AssetManifestEntry;
  load(key: string, options?: { timeoutMs?: number }): Promise<GLTF>; // default timeout ~8-10s per 15_ARCHITECTURE_FREEZE.md
  preload(key: string): void;
}
```

**Events**: `asset:loaded`, `asset:load-failed`, `asset:timeout` — see [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md).
**Lifecycle**: loader constructed once at module load; individual asset loads are per-call promises, not cached themselves (Texture/Material Managers own the *parsed result* cache; Asset Manager owns the *fetch/parse* machinery).
**Ownership**: module-level singleton.
**Dependencies**: none internal — a leaf, per the dependency graph in [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md).
**Extension points**: a new manifest entry — no change to `getGLTFLoader`'s configuration.

## `IShaderManager`

**Responsibilities**: not a runtime object with methods — a *convention* every shader family (`steam`, later `foam`/`coffee`) satisfies, plus the shared utility modules they all import.

```ts
interface ShaderMaterialFactory<TUniforms> {
  create(params: TUniforms): THREE.ShaderMaterial;
  defaultUniforms: TUniforms;
}

// Every shader family exports exactly this shape:
// engine/shaders/steam/SteamMaterial.ts -> ShaderMaterialFactory<SteamUniforms>
```

Full uniform/naming/folder conventions are frozen in [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md)'s Shader Contracts section, not repeated here.
**Events**: `shader:compiled`, `shader:failed` (the latter triggers the pre-shader fallback material — see [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)'s failure-mode table).
**Lifecycle**: a shader material is created per-part-instance (not globally cached like `MeshPhysicalMaterial`s, since uniforms are typically per-instance animated state).
**Ownership**: the part component that uses it (e.g. `ProceduralSteam`).
**Dependencies**: `engine/shaders/common/` (noise, remap, uniform helpers), Performance Manager (read-only: tier selects shader vs. pre-shader fallback — see the tier/asset-source orthogonality note in [03_3D_ENGINE.md](03_3D_ENGINE.md)).
**Extension points**: a new shader family — new folder, same `ShaderMaterialFactory` shape, zero change to existing families.

## `IEffectManager`

**Responsibilities**: compose a list of post-processing effect configs into an `EffectComposer` tree.

```ts
type EffectConfig =
  | { type: "bloom"; intensity: number; threshold: number }
  | { type: "vignette"; darkness: number }
  | { type: "dof"; focusDistance: number; focalLength: number; bokehScale: number };

interface IEffectManager {
  render(effects: EffectConfig[]): ReactElement;
}
```

**Scope boundary** (confirmed in [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)): WebGL post-processing only. DOM effects (confetti) never enter this union.
**Events**: none.
**Lifecycle**: pure function of its `effects` prop — no internal state, no cache.
**Ownership**: the scene composition root.
**Dependencies**: Performance Manager (read-only: tier may drop `dof`/`vignette` before `bloom`).
**Extension points**: a new `EffectConfig` union member + a `case` in `render` — this is the one manager where extension genuinely does touch the manager's own switch statement (adding a case), which is why it's called out explicitly as *sanctioned* in [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md): adding a discriminated-union variant + its render case never changes behavior for existing variants.

## `IInteractionManager`

**Responsibilities**: normalize raw pointer/keyboard input into typed gesture events; stay generic — no knowledge of *what* a gesture means to a particular feature (rotating a cup vs. dropping an ingredient is the caller's interpretation, not the manager's).

Types and signature are normative from [12_INTERACTION_SYSTEM.md](12_INTERACTION_SYSTEM.md), restated here verbatim rather than re-derived — an earlier draft of this section used different, incompatible shapes (coarse `GestureType`, a tuple `position`, a `bind()`-pattern return); that drift was caught during [RC0's consistency audit](27_RC0_APPROVAL.md) and corrected in favor of 12's original, more detailed design, which already supports gamepad and per-phase (`drag-start`/`drag-move`/`drag-end`) consumers that a coarser `"drag"` type couldn't:

```ts
type GestureType = "tap" | "drag-start" | "drag-move" | "drag-end" | "hover-start" | "hover-end" | "press-hold";
type PointerKind = "mouse" | "touch" | "pen" | "keyboard" | "gamepad";

interface GestureEvent {
  type: GestureType;
  pointerKind: PointerKind;
  position: { x: number; y: number }; // normalized [-1, 1]
  delta?: { x: number; y: number };    // present on drag-move
  pressure?: number;                    // present for pen input when reported
}

interface IInteractionManager {
  useGestureRecognizer(
    targetRef: RefObject<HTMLElement>,
    handlers: Partial<Record<GestureType, (event: GestureEvent) => void>>,
  ): void;
}
```

**Events emitted**: `interaction:started`, `interaction:ended` (generic — every gesture). Feature-specific semantic events (`cup:rotated`, `ingredient:dropped`) are emitted by the *feature* code interpreting the raw gesture, not by this manager — see [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md)'s Source column for why that boundary matters.
**Lifecycle**: one recognizer instance per bound target element, lives with the component that calls the hook.
**Ownership**: the feature hook consuming it (`useCupInteractionState`, future `useIngredientDrag`).
**Dependencies**: pointer-normalization math (coordinate conversion, not animation — see [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md)'s Review section for a naming/homing issue found here), EventBus (emit only).
**Extension points**: a new `GestureType` variant — existing consumers pattern-matching on the ones they care about are unaffected.

## `IAnimationManager` — ownership table, not a class

**Responsibilities**: not a runtime object — the documented rule for which of three tools (Framer Motion / raw `useFrame` / GSAP+ScrollTrigger) owns a given animation, plus the bridge-store contract that lets state cross the DOM/R3F boundary. Full table in [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md).

```ts
interface BridgeStore<T> {
  useValue(): T;      // reactive, DOM/Framer Motion side
  getValue(): T;       // imperative, useFrame side
  setValue(value: T): void;
}
```

**Events**: none directly — bridge stores are continuous state, not discrete events, by the same rule that separates Zustand stores from the EventBus everywhere else in this doc set.
**Lifecycle**: each bridge store instance is a module-level singleton (`scrollProgress`, the dev-stats store, the keyboard-rotation store).
**Ownership**: whichever module creates it via `createBridgeStore<T>(initial)`.
**Dependencies**: none — a leaf utility.
**Extension points**: `createBridgeStore<T>()` — a new bridged value is a new call, never a change to the factory.

## `IPerformanceManager`

**Responsibilities**: sample FPS, step an adaptive quality tier down under sustained low performance, never automatically step back up mid-session.

```ts
// 5 tiers as of Sprint 2.5 (a named, sanctioned Zero-Rewrite-Policy
// exception — the user's own brief named all 5 explicitly), not the
// original 3 sketched here at RC0.
type QualityTier = "minimal" | "low" | "medium" | "high" | "ultra";

interface IPerformanceManager {
  readonly tier: BridgeStore<QualityTier>;
  sampleFrame(fps: number): void; // Sprint 3.8 docs-sync fix — shipped as `fps`, not the originally-sketched `deltaMs`; the caller (`PerformanceSampler.tsx`) already computes FPS before calling this
}
```

**Events**: `performance:tier-changed`.
**Lifecycle**: production sampling instance is distinct from the dev-only `DevPanel` FPS collector (different sampling cadence/purpose — see [14_PERFORMANCE_STRATEGY.md](14_PERFORMANCE_STRATEGY.md)); both run for the life of their Canvas.
**Ownership**: module-level singleton (tier is global, not per-scene — a low-end device is low-end everywhere).
**Dependencies**: **none outward.** This is the one-directionality rule from [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md): Performance Manager never imports Effect/Shader/Material/Texture Managers. They import *it* (read `tier.useValue()`/`getValue()`), never the reverse.
**Extension points**: a new tier-sensitive consumer just reads `tier` — no change here.

## `IAnalyticsManager`

**Responsibilities**: track real user interactions through a typed, closed event union; pluggable sink (defaults to `console.debug` in dev).

Real shape, corrected here to match the actual Milestone 1 code (`engine/analytics/events.ts`) rather than a flattened sketch — every variant wraps its data in a `payload` field, not flat top-level properties:

```ts
type AnalyticsEvent =
  | { name: "hero_cup_rotated"; payload: { method: "drag" | "touch" | "keyboard" } }
  | { name: "theme_toggled"; payload: { theme: "light" | "dark" } }
  | { name: "nav_opened"; payload: { via: "mobile-menu" } }
  | { name: "webgl_unavailable"; payload: Record<string, never> }; // Sprint 2.1, implemented

interface AnalyticsSink { send(event: AnalyticsEvent): void; }

interface IAnalyticsManager {
  track(event: AnalyticsEvent): void;
  setSink(sink: AnalyticsSink): void;
}
```

**Relationship to the EventBus, clarified** (a real ambiguity found during this pass — see [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md)'s Review): the EventBus is internal, typed, synchronous, cross-manager coordination. Analytics is external reporting, allowed to be async, allowed to silently drop under sink backpressure without breaking the app. Where both care about the same real-world occurrence (e.g. a cup rotation), Analytics subscribes to the EventBus's `cup:rotated` and translates it into `hero_cup_rotated` — they are never the same mechanism wearing two names.
**Sprint 3.8 docs-sync finding**: `setSink`/`AnalyticsSink` as sketched above do not exist in the real, shipped `engine/analytics/tracking.ts` — `track()` hardcodes a `console.debug`-in-dev/no-op-in-prod branch directly, with a comment asking a future maintainer to hand-edit the function body when a real provider is chosen, not the swappable-sink mechanism this doc promises. `docs/26_API_STABILITY.md` marks this whole manager "Stable — already shipped Milestone 1," which is only true of `track()` and the event union, not the sink seam. Not fixed this sprint (a real, if small, engineering task, not a docs-only correction) — flagged in [RC1_RELEASE_CANDIDATE_REPORT.md](RC1_RELEASE_CANDIDATE_REPORT.md) as a Milestone 4 candidate (a real analytics provider is exactly when this seam would get built for real).
**Lifecycle**: module-level singleton; sink is swappable (dev console today, a real provider later — [01_ARCHITECTURE.md](01_ARCHITECTURE.md)'s documented swap point).
**Ownership**: module-level.
**Dependencies**: EventBus (subscribe, for events with both internal and reporting relevance).
**Extension points**: a new `AnalyticsEvent` union member — `track`'s signature never changes.

## `IDebugManager`

**Responsibilities**: dev-only overlay (FPS, `gl.info`, current preset, quality tier); toggled, never shown in production.

```ts
interface IDebugManager {
  toggle(): void;
  registerPanel(name: string, render: () => ReactElement): void; // future live-tweak panel extension point, undecided which library, evaluated only when a real milestone needs it
}
```

**Change from Milestone 1**: today's `DevPanel` imports `CameraPresetName` directly, coupling it to hero-cup. The frozen contract takes a generic `preset: string`, closing that coupling — see [03_3D_ENGINE.md](03_3D_ENGINE.md).
**Events**: consumes `performance:tier-changed`, `camera:transition-complete` — read-only, never emits.
**Lifecycle**: mounted once at the app root; visibility toggled via keyboard shortcut, gated on `NODE_ENV !== "production"`.
**Ownership**: app-level, not scene-scoped (works across whichever scene composition root is currently active).
**Dependencies**: BridgeStores it displays (FPS, tier); no dependency on any manager's internals beyond what those stores already expose.
**Extension points**: `registerPanel` — a future material/lighting live-tweak surface registers itself, `DebugManager`'s own render loop never changes.

## `IAIProvider` — Sprint 3.9, new

**Responsibilities**: stream a chat completion from a real LLM backend, independent of which one. This project's first genuine remote-model integration — every prior "AI" feature (`features/concierge/`'s recommendation engine) is a deterministic, synchronous, local function; see that module's own doc comment for why. Server-side only; a client never imports an implementation of this interface directly, only `POST /api/ai-barista/chat`.

```ts
interface AIProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIStreamChunk {
  content: string;
  done: boolean;
}

interface AIProvider {
  id: string;
  streamChat(messages: AIProviderMessage[], options: { signal?: AbortSignal }): AsyncGenerator<AIStreamChunk>;
}
```

**Implemented, Sprint 3.9**: `features/ai-barista/lib/providers/ollamaProvider.ts`, the only implementation this sprint, per the brief's explicit "Do NOT use placeholder AI. Use Ollama." Talks to Ollama's real `POST /api/chat` (newline-delimited JSON streaming). Model/host configurable via `OLLAMA_BASE_URL`/`OLLAMA_MODEL` env vars — swapping between llama3.1/qwen/mistral/gemma (any model already pulled locally) never needs a code change.
**Registry**: `features/ai-barista/lib/providers/registry.ts`'s `getAIProvider()`/`setAIProvider()` — the same register/resolve pattern `engine/camera/presets.ts` already established, this interface's sanctioned extension point. A second provider (a hosted API, say) is a new file implementing `AIProvider` plus one `setAIProvider()` call; every other file in the feature is unaffected — "no vendor lock-in," enforced by the seam, not just documented.
**Events**: `ai-barista:*` (see [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md)) — emitted by `features/ai-barista/hooks/useAiBaristaChat.ts`, one layer above the provider interface itself; `AIProvider` implementations have no EventBus dependency.
**Lifecycle**: `getAIProvider()` lazily constructs and caches a module-level singleton on first call.
**Ownership**: `src/app/api/ai-barista/chat/route.ts` is the only caller.
**Dependencies**: none on any other manager — deliberately isolated so a future provider swap can't accidentally couple to engine internals.
**Extension points**: `setAIProvider()`, as above.

## Related

[15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md) · [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md) · [20_PLUGIN_API.md](20_PLUGIN_API.md) · [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md) · [03_3D_ENGINE.md](03_3D_ENGINE.md) · [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md) · [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md)
