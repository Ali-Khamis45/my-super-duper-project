# 26 — API Stability Review

RC0 deliverable. Every public interface from [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md), [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md), and [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md), marked:

- **Stable** — already implemented in Milestone 1, contract proven in production, changes only through [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md)'s additive-extension path.
- **Frozen** — designed, validated through Sprint 0 and RC0, ready to implement. **Only these may be built during Milestone 2's sprints.**
- **Future** — designed (shape exists, in a doc), but its milestone hasn't arrived — implementing it now would be exactly the "half-finished code" [00_SYSTEM_PROMPT.md](00_SYSTEM_PROMPT.md) forbids.
- **Experimental** — genuine open question remains (a library choice, a coordination design not yet worked out) — explicitly *not* implementable yet, and not pretending otherwise.

| Interface | Status | Rationale | Implementable in |
|---|---|---|---|
| Scene composition contract (`SceneCompositionRoot`) | Stable | Already the pattern `CupScene.tsx` implements; this RC0 pass only names and types what's already proven | N/A — already shipped |
| `ICameraManager` (`resolvePreset`/`resolvePath`, `registerPreset`/`registerPath`) | Frozen | Fully specified, no open questions, backward-compatible with the shipped `hero` preset | Sprint 2.1 |
| `CameraRig` transition/path props | Frozen | Additive to the existing, shipped `CameraRig` prop surface | Sprint 2.1 |
| `IEnvironmentManager` / `ILightingManager` (registries + `ThemeToPresetMap`) | Frozen | Mechanical split of the existing, shipped `LightingThemes.ts` | Sprint 2.1 (scaffolding) |
| Real day/night `EnvironmentPresetDefinition`/`LightingPresetDefinition` entries | Future | The registries are Frozen; the actual day/night *content* is Milestone 2's other headline feature, scheduled explicitly | Sprint 2.6 |
| `IMaterialManager` (`getOrCreate`/`invalidate`/`clear`, structured `MaterialCacheKey`) | Frozen | Tightened during [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md)'s Review (string key → structured key) before ever being implemented — exactly what a freeze is for | Sprint 2.3 |
| `ITextureManager` | Frozen | Same shape as Material Manager, no open questions | Sprint 2.2/2.3 |
| `IAssetManager` (`getGLTFLoader`/`resolve`/`load`/`preload`) | Frozen | No open questions; verified against a throwaway asset, not a real one — see [25_IMPLEMENTATION_READINESS.md](25_IMPLEMENTATION_READINESS.md) | Sprint 2.2 |
| `ShaderMaterialFactory<TUniforms>` (the general shape) | Frozen | The contract every shader family satisfies is settled | Sprint 2.4 (as the steam family's shape) |
| Steam's concrete `SteamUniforms`/`SteamMaterial` | Frozen | Fully specified in [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md), no open questions | Sprint 2.4 |
| Foam/coffee concrete uniform shapes (`uTiltAngle`, `uRippleOrigins[]`, etc.) | Future | Shape sketched in [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md) for continuity, but foam/coffee are Milestone 3 — only `common/`'s shared utilities (which they'll consume) are Frozen for Sprint 2.4 | Milestone 3 |
| `IEffectManager` (`EffectConfig` union + `render`) | Frozen | Mechanical migration from the existing, shipped `EffectsStack` prop shape | Sprint 2.1 |
| `IInteractionManager` (`useGestureRecognizer`, `GestureEvent`, `GestureType`, `PointerKind`) | Frozen | **Corrected during this RC0 pass** — an earlier draft of [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) drifted from [12_INTERACTION_SYSTEM.md](12_INTERACTION_SYSTEM.md)'s original shape; now reconciled to a single canonical definition before any implementation ever consumed the drifted version. This is the intended outcome of a design freeze — the contradiction was caught here, not after Sprint 2.1 shipped two incompatible versions | Sprint 2.1 (flagged highest regression-risk in [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md)) |
| `IAnimationManager` ownership table (Framer/`useFrame`/GSAP) | Stable | Already true and followed since Milestone 1; this RC0 pass only documents it explicitly | N/A — already in effect |
| `createBridgeStore<T>` / `BridgeStore<T>` | Frozen | Generalizes three already-shipped, working ad hoc implementations (dev-stats, keyboard-rotation, and the pattern `useMouseParallax` already uses) | Sprint 2.1 |
| `scrollProgress` bridge store instance | Frozen (scaffolding) / Future (populated use) | The store itself is Frozen; nothing calls `setValue` on it until GSAP ScrollTrigger exists (Milestone 6) | Sprint 2.1 (created, unused) |
| `IPerformanceManager` (`tier`, `sampleFrame`, one-directionality rule) | Frozen | Fully specified including the dependency-direction constraint that prevents the one real cycle risk in the whole design | Sprint 2.5 |
| `IAnalyticsManager` (`track`/`setSink`, existing 3-event union) | Stable | Existing 3 events (`hero_cup_rotated`/`theme_toggled`/`nav_opened`) shipped in Milestone 1 | N/A — already shipped |
| `webgl_unavailable` analytics event addition | Frozen | A single additive union member, no open questions, not sprint-scheduled but implementable opportunistically alongside the `webgl:context-lost` work | Sprint 2.1/2.2 (alongside GPU-context-loss handling) |
| `IDebugManager` (`toggle`, generic `preset: string`) | Frozen | Closes the existing `CameraPresetName` coupling in the shipped `DevPanel` | Sprint 2.1 |
| `IDebugManager.registerPanel` (future live-tweak panel) | Experimental | Depends on a library choice (e.g. `leva`) explicitly deferred until a real milestone needs live-tweak UI — the extension point's *existence* is Frozen, its concrete registration payload shape is not | Not scheduled — evaluated when needed |
| `IPartRegistry<TName, TProps>` / `createPartRegistry` | Frozen | Generalizes the already-shipped, working `cupPartRegistry` — zero behavior change for existing consumers | Sprint 2.1 |
| `IEventBus` (`emit`/`subscribe`/`unsubscribe`, ordering/failure contract) | Frozen | Fully specified in [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md), no open questions | Sprint 2.1 |
| Full `AppEvent` union (all 19 events in [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md)) | Frozen (type) / Future (most emit sites) | The union itself is Frozen as a type; individual events are only *emitted* once their owning feature ships (e.g. `checkout:completed` has no emitter until Milestone 8) — declaring the type early is not the same as building dead code, since the type has zero runtime footprint | Type: Sprint 2.1. Emit sites: per-feature milestone |
| `IngredientPartProps`, second `createPartRegistry` instance for ingredients | Future | Sketched in [20_PLUGIN_API.md](20_PLUGIN_API.md) for continuity; Milestone 5 scope | Milestone 5 |
| Customizer store, cart store | **Implemented** — customizer store since Sprint 3.2, cart store since Sprint 3.6, both built to [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md)'s pre-designed shape (customizer store's real shape diverged from its own original sketch as the real brief arrived; cart store's persistence/`addItem`/`removeItem`/`clear` core matched the sketch exactly, extended additively for Sprint 3.6's richer requirements) | Sprint 3.2 / Sprint 3.6 |
| `Product` data shape | Future | Sketched in [20_PLUGIN_API.md](20_PLUGIN_API.md); Milestone 4 scope | Milestone 4 |
| Scroll-driven camera path population, drag-vs-scroll coordination | Experimental | The coordination design is explicitly named-but-not-solved in [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) scenario 7 — correctly excluded from Sprint 2, since Milestone 6 doesn't need it yet either | Not scheduled — designed in full at Milestone 6 |
| AI Concierge recommendation flow (loading/cancellation ownership) | **Resolved, Sprint 3.5 — decided against TanStack Query.** No query-key convention was designed because none was needed: `features/concierge/lib/recommendationEngine.ts` is a pure local function (no real endpoint exists), so ADR-0005's "no placeholder queries" rules out wrapping it in a simulated fetch. `useRecommendation.ts`'s React 19 `useTransition` + request-id token satisfies every real requirement (non-blocking, cancellable, a loading flag) without pretending this is remote data. If a real recommendation endpoint is ever built, `generateRecommendation`'s pure `(profile, drinks, options) -> Recommendation` signature is the contract it would need to satisfy, and *that* would be the real TanStack Query design pass this row originally anticipated. | Sprint 3.5 |

## The rule this table enforces

Every row scheduled into a Milestone 2 sprint in [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md) is marked **Frozen** here, cross-checked line by line — no Sprint 2.1-2.6 deliverable in that doc corresponds to a row marked Future or Experimental in this one. Where a doc (13, 18, 20) sketches a Future shape for continuity, that sketch is clearly separable from what actually gets built this milestone, and this table is the enforcement mechanism, not just a description of it.

## Related

[22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) · [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md) · [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md) · [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) · [27_RC0_APPROVAL.md](27_RC0_APPROVAL.md)
