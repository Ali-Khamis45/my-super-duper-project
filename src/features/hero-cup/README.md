# hero-cup

The full-viewport hero: a live, interactive, procedurally-modeled coffee cup rendered with React Three Fiber. Also, since Sprint 3.2, the rendering engine `features/customizer/` reuses to power `/customize` — this README is the template every future `features/<name>/` folder follows — Architecture, Flow, Responsibilities, Future Extension.

## Architecture

```
hero-cup/
├── components/
│   ├── Hero.tsx            RSC — layout + copy, composes CupCanvasLoader
│   ├── CupCanvasLoader.tsx "use client" — the ssr:false dynamic-import boundary
│   ├── CupCanvas.tsx       "use client" — <Canvas>, WebGL probe, frameloop mode
│   ├── CupScene.tsx        camera/lighting/environment/effects composition
│   ├── CupAssembly.tsx     renders every part in order, owns the root transform
│   ├── CupStaticFallback.tsx  real SVG fallback (no WebGL / not yet hydrated)
│   └── HeroCopy.tsx        "use client" — headline/CTA, entrance + magnetic/pop motion
├── parts/Procedural{Cup,Lid,Sleeve,Coffee,Foam,Steam,Logo,ContactShadow}.tsx
│   ├── ProceduralIngredientRing.tsx       Sprint 3.3 — shared shape for 7 of 9 ingredient types
│   ├── ProceduralIngredientSprinkles.tsx  Sprint 3.3 — the one ingredient with real distinct geometry
│   ├── ProceduralIngredientIce.tsx        Sprint 3.4 — same shared ring shape, real float/drift behavior
│   └── model/               empty — future GLB-backed parts land here
├── registry/{types,cupPartRegistry}.ts   the CupPartProps contract + registry
├── geometry/{cupProfile,cupGeometry}.ts  hand-authored silhouettes + builders
├── lib/materialOverridesToVariant.ts     Sprint 3.2's first real `lib/` consumer — see below
└── hooks/{useCupInteractionState,useCupKeyboardControls,useLiquidPhysics,useMouseParallax,useWebGLSupport}.ts
```

`engine/physics/liquidPhysics.ts` (not inside this feature folder — a genuine cross-cutting engine module, same reasoning as `engine/materials`/`engine/shaders`) holds the actual spring-damper simulation math; `useLiquidPhysics.ts` here is the R3F-side owner that steps it once per frame and emits its settle-transition events. See "Sprint 3.4" below.

An earlier draft (Milestone 1) added a `lib/cupConfig.ts` default-config placeholder for a future customizer, but nothing consumed it — removed for having zero consumers, per [06_CODING_STANDARDS.md](../../../docs/06_CODING_STANDARDS.md)'s "no half-finished code" rule. `lib/` returned in Sprint 3.2 with `materialOverridesToVariant.ts`, which has three real callers from the moment it was added (`ProceduralCup`/`Sleeve`/`Lid`) — the difference between speculative and justified scaffolding is exactly "does anything call this today."

`usePrefersReducedMotion` is **not** in this feature's `hooks/` — it lives in `src/hooks/` because `design-system/primitives/GlowCard` needs it too. See [docs/01_ARCHITECTURE.md](../../../docs/01_ARCHITECTURE.md)'s "two+ consumers" rule.

**Sprint 3.2**: `CupAssembly`/`CupScene`/`CupCanvas`/`CupCanvasLoader` all gained optional `partOverrides`/`cupScale`/`route` props, threaded straight through the chain. Every prop is `undefined` for the Hero route (the only caller before this sprint), so its rendering is unchanged — verified via that route's own full e2e suite, including a pixel-diff visual-regression baseline, re-run and passed after this change. `features/customizer/`'s `resolvePartOverrides` is the only real producer of non-empty values; this feature has zero knowledge of what a "customizer" is, it just applies whatever `CupPartProps` it's handed, the same contract every part already implemented.

**Sprint 3.3**: the same pattern, one layer further. `CupAssembly` gained an optional `ingredientLayers?: ResolvedIngredientLayer[]` prop (threaded through `CupScene`/`CupCanvas`/`CupCanvasLoader`, same as `partOverrides`), rendered dynamically after the fixed `CUP_PART_ORDER` parts rather than added to that order — an ingredient layer's count and identity vary at runtime, unlike the cup's always-present 8 parts. `registry/types.ts`'s `CupPartName` gained two entries (`ingredient-ring`/`ingredient-sprinkles`); `MaterialSurface` gained `"ingredient"`. `features/composer/lib/resolveIngredientLayers.ts` is the only real producer of non-empty values, exactly mirroring `resolvePartOverrides`'s role for Sprint 3.2 — this feature still has zero knowledge of what an "ingredient" or "composer" is.

**Sprint 3.4**: `useCupInteractionState` gained a `velocityRef` field ([04_MOTION_ENGINE.md](../../../docs/04_MOTION_ENGINE.md)'s "Coffee/foam liquid physics" section named this exact extension two sprints ago). `CupAssembly` now also calls the new `useLiquidPhysics` hook — the single owner of the liquid-physics simulation, computed once and read by `coffee`/`foam`/`ingredient-ice` via a new `physicsRef?: RefObject<LiquidPhysicsState>` field on `CupPartProps` (passed to every part, ignored by the ones that don't need it — the same additive-field pattern `materialOverrides`/`colorway` established). `registry/types.ts`'s `CupPartName` gained one more entry (`ingredient-ice`). `engine/shaders/coffee/CoffeeSurface.ts`/`foam/FoamSurface.ts` each compose a real vertex-displacement injection alongside their existing Sprint 2.4 fresnel rim, instead of a second, competing `onBeforeCompile` assignment.

## Flow

1. `app/page.tsx` renders `Hero` (Server Component); `app/customize/page.tsx` renders `features/customizer/`'s `CustomizerExperience`, which uses `CupCanvasLoader` the same way, with real override props.
2. `Hero`/`CustomizerExperience` render `CupCanvasLoader` (client, dynamic-imports `CupCanvas` with `ssr: false`) — split from any server-rendered parent specifically because `ssr: false` is only legal inside a Client Component in Next.js 16.
3. `CupCanvas` probes WebGL (`useWebGLSupport`); if unavailable, renders `CupStaticFallback` instead of mounting `<Canvas>`. It's also `tabIndex`-focusable with a keydown handler (`useCupKeyboardControls`) — Left/Right rotates the cup for keyboard-only users, since drag has no keyboard equivalent otherwise.
4. Inside `<Canvas>`, `CupScene` reads the active theme (`engine/theme`), composes `CameraRig`, lighting, `SceneEnvironment`, `CupAssembly`, and `EffectsStack`.
5. `CupAssembly` resolves all 8 parts via `resolveCupPart`, renders them in `CUP_PART_ORDER`, and owns idle-float + the interaction-driven rotation from `useCupInteractionState` + the overall `scale` (cup size variants, Sprint 3.2). If `ingredientLayers` is present (Sprint 3.3, composer-only), each entry is resolved via the same `resolveCupPart` and rendered after the fixed parts. `CupAssembly` also calls `useLiquidPhysics` (Sprint 3.4), passing its result to every part as `physicsRef` — `coffee`/`foam`/`ingredient-ice` read it each frame to drive their own displacement/drift, every other part ignores it.
6. `Hero` also mounts `<DevPanel />` (`engine/devpanel/`) — invisible unless both non-production and toggled with the backtick key, showing live FPS/draw-call stats. `CustomizerExperience` does not mount `DevPanel`/dev-only probes — those stay Hero-route-only.

## Responsibilities

- **This feature owns**: the cup's geometry/materials/parts, its interaction state machine, the hero layout and copy, the SSR boundary, and (since Sprint 3.2) the generic override-application contract every consumer of this cup rendering pipeline uses.
- **This feature borrows from `engine/`**: camera rig/presets, post-processing, theme-to-lighting mapping, material/texture/environment factories (including the shared material cache, now with real cache-hit reuse across customizer selections — see `lib/materialOverridesToVariant.ts`), motion presets, analytics tracking.
- **This feature does not own**: the Navbar, the design tokens, customizer *selection state* (that's `features/customizer/`'s `stores/customizer-store.ts`), or anything another feature will need — those live in `engine/`/`design-system/`/the owning feature precisely so this feature doesn't have to re-derive them.

## Known simplifications (see [docs/3d-asset-pipeline.md](../../../docs/3d-asset-pipeline.md) for the full list)

- All parts are procedural geometry, not modeled assets — by design, not a shortcut; see [ADR-0002](../../../docs/adr/0002-r3f-architecture.md).
- Steam is a real shader (Sprint 2.4), still single-octave noise, not the eventual domain-warped simulation.
- The logo is an oriented flat plane, not a projected decal.
- Coffee/foam liquid displacement (Sprint 3.4) doesn't recompute vertex normals after displacing — the amplitude is small enough this isn't visually significant, and a correct recompute would meaningfully raise the shader's cost for an effect nobody would notice is slightly mis-lit.

## Future extension

- **Any sprint**: a real GLB part drops in via one `cupPartRegistry.ts` entry — see the asset pipeline doc's worked example.
- **`colorway`** (`CupPartProps`, typed since Milestone 1) still has no real consumer — Sprint 3.2's customizer uses `materialOverrides` directly instead, a finer-grained mechanism than the coarser named-token `colorway` was designed for. Worth reconsidering whether `colorway` is still the right shape now that a real consumer exists to test it against, or whether it should be retired in favor of what `materialOverrides` already covers.
