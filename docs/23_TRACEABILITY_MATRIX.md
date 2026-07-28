# 23 — Traceability Matrix

RC0 deliverable. For each major future feature: the requirement's origin, which docs designed it, which ADR (if any) governs it, which manager/interface/store/events it touches, where its test strategy lives, and which sprint/milestone builds it. This is the "does every future feature actually trace back to a decision, not a vibe" check — if a row can't be filled in from existing docs, that's a gap RC0 should have caught, not implementation discovering it live.

## Steam Shader System

| | |
|---|---|
| Requirement | [08_MILESTONES.md](08_MILESTONES.md) Milestone 2 headline feature; addresses the disclosed Milestone 1 CDR critique ("steam isn't very visible/convincing") — [reviews/milestone-1-creative-director-review.md](reviews/milestone-1-creative-director-review.md) |
| Architecture doc | [03_3D_ENGINE.md](03_3D_ENGINE.md), [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md) |
| ADR | [0008-shader-authoring-approach.md](adr/0008-shader-authoring-approach.md) |
| Manager | Shader Manager, Performance Manager (tier-based fallback) |
| Interface | `ShaderMaterialFactory<SteamUniforms>` — [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) |
| Store | None — per-instance uniforms, not shared state |
| Events | `shader:compiled`, `shader:failed` — [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md) |
| Tests | [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md) Shader Manager row |
| Sprint | [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md) Sprint 2.4 |

## Coffee Physics

| | |
|---|---|
| Requirement | [08_MILESTONES.md](08_MILESTONES.md) Milestone 3 — surface tilt/inertia/ripple, foam reaction |
| Architecture doc | [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md) ("not a physics engine" section), [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md) Coffee section |
| ADR | [0007-animation-orchestration.md](adr/0007-animation-orchestration.md), [0008-shader-authoring-approach.md](adr/0008-shader-authoring-approach.md) |
| Manager | Shader Manager, Interaction Manager (velocity input) |
| Interface | `useCupInteractionState`'s planned `velocityRef` extension — [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md), flagged in [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) scenario 2 |
| Store | None new — reads existing interaction state |
| Events | None — continuous velocity sampling, not a discrete signal |
| Tests | [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md) Shader Manager + Interaction Manager rows |
| Sprint | Milestone 3 — after the 6 Milestone 2 sprints, not itself one of them |

## Live Customizer

| | |
|---|---|
| Requirement | [08_MILESTONES.md](08_MILESTONES.md) Milestone 4 — color/material/texture/finish, sleeve, ingredients wired to live 3D updates |
| Architecture doc | [03_3D_ENGINE.md](03_3D_ENGINE.md) Material Manager section, [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) scenario 4 |
| ADR | [0005-state-management.md](adr/0005-state-management.md) |
| Manager | Material Manager, Texture Manager, Camera Manager (`product` preset) |
| Interface | `IMaterialManager`, `CupPartProps.materialOverrides`/`colorway` (typed since Milestone 1, unused until now) |
| Store | Customizer store — [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md) |
| Events | None for selection itself (continuous state); optional analytics on selection |
| Tests | [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md) Material/Texture Manager row |
| Sprint | Milestone 4 — Material Manager's caching groundwork ships in Sprint 2.3 |

## AI Barista

| | |
|---|---|
| Requirement | [08_MILESTONES.md](08_MILESTONES.md) Milestone 7 — recommendation flow |
| Architecture doc | [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) scenario 5 |
| ADR | [0005-state-management.md](adr/0005-state-management.md) (TanStack Query wiring) |
| Manager | Camera Manager (`ai` preset) |
| Interface | **Known gap, not yet frozen**: no query-key/loading-state convention exists for TanStack Query — flagged explicitly in [08_MILESTONES.md](08_MILESTONES.md)'s Milestone 7 entry rather than assumed solved |
| Store | Customizer store (applies the recommended colorway) |
| Events | `ai:recommendation-ready` — [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md) |
| Tests | Not yet designed — blocked on the data-fetching convention gap above |
| Sprint | Milestone 7 |

## Premium Checkout Experience

| | |
|---|---|
| Requirement | [08_MILESTONES.md](08_MILESTONES.md) Milestone 8 — animated cart, floating checkout, confetti, order timeline |
| Architecture doc | [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) scenario 9, [01_ARCHITECTURE.md](01_ARCHITECTURE.md) `features/commerce/` spec |
| ADR | None — below [10_ADR_GUIDELINES.md](10_ADR_GUIDELINES.md)'s threshold; a feature folder convention, not an architectural trade-off |
| Manager | Camera Manager (`checkout` preset) — Effect Manager explicitly **not** involved (confetti is DOM-layer, see the scope boundary in [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md)) |
| Interface | None new to the engine — commerce is orthogonal by design |
| Store | Cart store — [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md) |
| Events | `checkout:started`, `checkout:completed` — [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md) |
| Tests | Not yet designed — Milestone 8 scope |
| Sprint | Milestone 8 |

## Scroll Storytelling

| | |
|---|---|
| Requirement | [08_MILESTONES.md](08_MILESTONES.md) Milestone 6 — cinematic scroll-driven camera, exploded view, narrative |
| Architecture doc | [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md) (bridge store, Lenis+GSAP wiring, camera paths), [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) scenario 7 |
| ADR | [0007-animation-orchestration.md](adr/0007-animation-orchestration.md) |
| Manager | Camera Manager (path mode), Interaction Manager (coordination — flagged, not designed in full; see below) |
| Interface | `CameraPathName` registry, `scrollProgress` bridge store |
| Store | `scrollProgress` — [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md) |
| Events | `camera:transition-start`, `camera:transition-complete` — [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md) |
| Tests | [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md) Camera Manager row |
| Sprint | Scaffolding (empty path registry) ships Sprint 2.1; real paths populate at Milestone 6. **Known deferred design**: drag-vs-scroll coordination while a path is pinned, named in [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md), not solved yet |

## Day/Night Dynamic Lighting

| | |
|---|---|
| Requirement | [08_MILESTONES.md](08_MILESTONES.md) Milestone 2's other headline feature — independent of light/dark UI theme |
| Architecture doc | [03_3D_ENGINE.md](03_3D_ENGINE.md) Environment/Lighting Manager split |
| ADR | None dedicated — a registry-pattern application below the ADR threshold, same reasoning as camera presets |
| Manager | Environment Manager, Lighting Manager |
| Interface | `IEnvironmentManager`, `ILightingManager`, `ThemeToPresetMap` — [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) |
| Store | None — registry-resolved, theme-driven |
| Events | `lighting:changed`, `theme:changed` — [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md) |
| Tests | [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md) Environment/Lighting Manager row |
| Sprint | Scaffolding Sprint 2.1; real day/night presets populate Sprint 2.6 |

## Ingredient Drag & Drop / Builder

| | |
|---|---|
| Requirement | [08_MILESTONES.md](08_MILESTONES.md) Milestone 5 — drag-and-drop, physics/particles/sound, menu with morphing selection |
| Architecture doc | [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) scenario 3, [20_PLUGIN_API.md](20_PLUGIN_API.md) (new ingredients), [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md) (particles) |
| ADR | [0002-r3f-architecture.md](adr/0002-r3f-architecture.md) (registry pattern), [0009-asset-compression-pipeline.md](adr/0009-asset-compression-pipeline.md) (Meshopt's named candidate scene) |
| Manager | Interaction Manager, a second `createPartRegistry` instance, Material/Texture Manager, Asset Manager |
| Interface | `IngredientPartProps`, `GestureEvent` (`drag-start`/`drag-move`/`drag-end`) — [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) |
| Store | Ingredient selection likely lives in the Customizer store, not a separate one — no new store contract needed |
| Events | `ingredient:dropped` — [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md) |
| Tests | [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md) Interaction Manager row |
| Sprint | Interaction Manager scaffolding ships Sprint 2.1; ingredients themselves are Milestone 5. `audio/` also created here per [01_ARCHITECTURE.md](01_ARCHITECTURE.md) — first real sound need |

## Replacing Procedural Cup with Production GLB Assets

| | |
|---|---|
| Requirement | Whenever real 3D assets are commissioned — not milestone-locked, the mesh-swap contract is designed to slot in whenever assets are ready, independent of the 24-phase schedule |
| Architecture doc | [3d-asset-pipeline.md](3d-asset-pipeline.md) (mesh-swap contract), [03_3D_ENGINE.md](03_3D_ENGINE.md) (Asset Manager) |
| ADR | [0002-r3f-architecture.md](adr/0002-r3f-architecture.md), [0009-asset-compression-pipeline.md](adr/0009-asset-compression-pipeline.md) |
| Manager | Asset Manager, Material Manager (materials assigned by the engine, not the GLB — see [3d-asset-pipeline.md](3d-asset-pipeline.md)) |
| Interface | `IAssetManager`, `CupPartComponent` (registry's `model` implementation slot, already typed since Milestone 1) |
| Store | None |
| Events | `asset:loaded`, `asset:load-failed`, `asset:timeout` — [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md) |
| Tests | [21_TEST_STRATEGY.md](21_TEST_STRATEGY.md) Asset Manager row |
| Sprint | Loader machinery ships Sprint 2.2; the actual swap is asset-availability-gated, not sprint-gated |

## Related

[15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [08_MILESTONES.md](08_MILESTONES.md) · [16_ENGINEERING_SPRINTS.md](16_ENGINEERING_SPRINTS.md) · [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) · [19_EVENT_CATALOG.md](19_EVENT_CATALOG.md) · [24_RISK_REGISTER.md](24_RISK_REGISTER.md)
