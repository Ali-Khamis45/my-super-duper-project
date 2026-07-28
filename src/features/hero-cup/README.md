# hero-cup

The full-viewport hero: a live, interactive, procedurally-modeled coffee cup rendered with React Three Fiber. This README is the template every future `features/<name>/` folder follows — Architecture, Flow, Responsibilities, Future Extension.

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
│   └── model/               empty — future GLB-backed parts land here
├── registry/{types,cupPartRegistry}.ts   the CupPartProps contract + registry
├── geometry/{cupProfile,cupGeometry}.ts  hand-authored silhouettes + builders
└── hooks/{useCupInteractionState,useCupKeyboardControls,useMouseParallax,useWebGLSupport}.ts
```

No `lib/` folder exists this milestone — an earlier draft added a `cupConfig.ts` default-config placeholder for the future customizer, but nothing consumed it (unlike the camera-preset registry, which *is* exercised today just with only `"hero"` populated). Zero-consumer scaffolding is exactly what [06_CODING_STANDARDS.md](../../../docs/06_CODING_STANDARDS.md)'s "no half-finished code" rule exists to catch — removed during the milestone's engineering review rather than kept for its own sake.

`usePrefersReducedMotion` is **not** in this feature's `hooks/` — it lives in `src/hooks/` because `design-system/primitives/GlowCard` needs it too. See [docs/01_ARCHITECTURE.md](../../../docs/01_ARCHITECTURE.md)'s "two+ consumers" rule.

## Flow

1. `app/page.tsx` renders `Hero` (Server Component).
2. `Hero` renders `HeroCopy` (client, animated) and `CupCanvasLoader` (client, dynamic-imports `CupCanvas` with `ssr: false`) — split into two client components specifically because `ssr: false` is only legal inside a Client Component in Next.js 16, and `Hero` itself needs to stay server-rendered.
3. `CupCanvas` probes WebGL (`useWebGLSupport`); if unavailable, renders `CupStaticFallback` instead of mounting `<Canvas>`. It's also `tabIndex`-focusable with a keydown handler (`useCupKeyboardControls`) — Left/Right rotates the cup for keyboard-only users, since drag has no keyboard equivalent otherwise.
4. Inside `<Canvas>`, `CupScene` reads the active theme (`engine/theme`), composes `CameraRig`, lighting, `SceneEnvironment`, `CupAssembly`, and `EffectsStack`.
5. `CupAssembly` resolves all 8 parts via `resolveCupPart`, renders them in `CUP_PART_ORDER`, and owns idle-float + the interaction-driven rotation from `useCupInteractionState`.
6. `Hero` also mounts `<DevPanel />` (`engine/devpanel/`) — invisible unless both non-production and toggled with the backtick key, showing live FPS/draw-call stats.

## Responsibilities

- **This feature owns**: the cup's geometry/materials/parts, its interaction state machine, the hero layout and copy, the SSR boundary.
- **This feature borrows from `engine/`**: camera rig/presets, post-processing, theme-to-lighting mapping, material/texture/environment factories, motion presets, analytics tracking.
- **This feature does not own**: the Navbar, the design tokens, or anything another feature will need — those live in `engine/`/`design-system/` precisely so this feature doesn't have to re-derive them.

## Known simplifications (see [docs/3d-asset-pipeline.md](../../../docs/3d-asset-pipeline.md) for the full list)

- All parts are procedural geometry, not modeled assets — by design, not a shortcut; see [ADR-0002](../../../docs/adr/0002-r3f-architecture.md).
- Steam is billboarded planes, not a shader/particle simulation.
- The logo is an oriented flat plane, not a projected decal.

## Future extension

- **Milestone 2**: real steam shader/particle sim (`engine/shaders/steam/`, doesn't exist yet), day/night `LightingThemes`.
- **Milestone 3**: liquid physics — `coffee`/`foam` parts gain surface tilt/ripple driven by `useCupInteractionState`'s drag/rotate states.
- **Milestone 4**: real Zustand-backed customizer state arrives (a `lib/` or `stores/` addition at that point, not before); `colorway`/`materialOverrides` on `CupPartProps` get real consumers for the first time.
- **Any milestone**: a real GLB part drops in via one `cupPartRegistry.ts` entry — see the asset pipeline doc's worked example.
