# 01 — Architecture

## Layer split

```
src/
  app/             Next.js App Router routes — composition only, minimal logic
  components/      Cross-cutting UI chrome not owned by any single feature (navbar, shadcn primitives)
  design-system/   Design tokens + base visual primitives + theme UI. The visual vocabulary.
  engine/          Cross-cutting, non-visual-vocabulary systems shared by every current/future feature:
                   motion, theme bridging, graphics utilities, camera, post-processing effects,
                   analytics, dev tooling. Framework for building features, not a feature itself.
  features/        Vertical domain features (hero-cup today; commerce, ai-barista, etc. later).
                   Each feature owns its components/hooks/state and has a README.
  hooks/, lib/, stores/, styles/, types/   App-wide utilities not specific to one layer above.
```

**Rule of thumb:** if two+ features will need it, it belongs in `engine/` or `design-system/`, not duplicated per feature. If only one feature needs it, it stays in that feature's folder. Nothing moves to `engine/` speculatively — it moves there when a second consumer actually appears, or when a doc in this set has already specified the shared contract in advance (as the camera/effects registries do here).

Why `design-system/` and `engine/` are split rather than merged: `design-system/` is the *visual vocabulary* (color, type, the components a designer would recognize). `engine/` is *machinery* (how motion is timed, how the 3D scene is lit, how a pointer gesture is normalized) that has no visual identity of its own — a button doesn't know or care that `engine/motion` computed its transition curve.

## The registry/contract pattern

Used identically in three places this milestone, deliberately — one convention, multiple applications, so a contributor who understands one understands all three:

1. **Cup parts** (`features/hero-cup/registry/`) — `CupPartName × implementation ("procedural" | "model")`. Every part implements the same `CupPartProps` interface; `CupAssembly` only ever depends on that interface.
2. **Camera presets** (`engine/camera/presets.ts`) — `CameraPresetName` is a full type union of every camera state the whole 24-phase roadmap will need (`hero`, `product`, `checkout`, `ai`, `ingredient`, `exploded`); only `hero` has a registered implementation today. Adding `product` later is one registry entry, not a refactor.
3. **Post-processing effects** (`engine/effects/EffectsStack.tsx`) — effects are registered by name and composed declaratively; `bloom` is the only one registered today, `DOF`/`vignette`/`chromatic-aberration`/`SSR`/`noise` are documented future entries (see [03_3D_ENGINE.md](03_3D_ENGINE.md)).

**Why this matters:** it's what makes "build procedurally now, swap to a real GLB/feature later with zero surrounding-code changes" literally true instead of aspirational.

## SSR / client boundary

Anything touching `three`/`@react-three/*` is dynamically imported with `ssr: false` from a Server Component wrapper, with a real fallback (a static rendered image), never a bare spinner. This keeps the 3D stack out of the server bundle and out of the initial HTML entirely — verified at the end of every milestone that touches 3D by checking `next build` output / Network tab.

## State strategy

- **Zustand** (`stores/`) — ephemeral, client-only UI state (nav open/closed, dev-panel toggle, theme override). Small, no middleware beyond what's needed.
- **TanStack Query** — reserved for server/remote data. Wired (provider + client) from milestone 1 so the plumbing is proven, but not used to fetch anything until a feature has a real endpoint. No invented calls to "exercise" it.
- **No Redux, no ad hoc Context-as-a-store.** See [ADR-0005](adr/0005-state-management.md).
- **Interaction state machines** (e.g. `useCupInteractionState`) for anything with more than 2-3 mutually exclusive states — replaces scattered booleans (`isDragging`, `isHovering`, ...) with one source of truth. See [state-machine.md](state-machine.md).

## Future modules (documented now, built on arrival)

These are fully specified here so their eventual implementation has zero ambiguity, but **no source folders exist for them yet** — creating empty files for unused systems is dead code, not architecture.

- **`audio/`** — `AudioManager.ts` (init/mute/volume, respects a reduced-motion-adjacent "reduced audio" preference), `Sound.ts` (single sound instance: load, play, spatial params), `Ambient.ts` (looping background layer). Arrives with the milestone that first needs a real sound (ingredient-drop, checkout success) — explicitly **not** Sprint 2.2's Asset & Resource Platform, despite "Audio Pipeline" appearing in that sprint's brief; see [reviews/sprint-2.2-review.md](reviews/sprint-2.2-review.md) for why building it there would have had zero real consumer and zero frozen contract.
- **`features/commerce/`** — `cart/`, `checkout/`, `orders/`, `payments/` subfolders, each a vertical slice (components/hooks/state) following the same feature-README template as `hero-cup`. Arrives with the Shopping Experience milestone.
- **`engine/shaders/`** — still unbuilt, arrives Sprint 2.4. `engine/assets/` (loading/caching/lifecycle for GLB/textures), `engine/interaction/`, `engine/events/`, `engine/state/`, `engine/environment/`, `engine/lighting/`, `engine/performance/` now exist — built across Sprint 2.1 (Rendering Core) and Sprint 2.2 (Asset & Resource Platform), see [03_3D_ENGINE.md](03_3D_ENGINE.md)'s Current State section for what's actually in each.
- **`engine/analytics/` full event surface** — today covers only real milestone-1 interactions (`hero_cup_rotated`, `theme_toggled`, `nav_opened`). Commerce/AI-barista events get added when those features exist, not before. One exception, identified in the [Architecture Freeze](15_ARCHITECTURE_FREEZE.md)'s failure-mode analysis and frozen in [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md): a `webgl_unavailable` event is worth adding alongside the existing `CupStaticFallback` handling, since real-world frequency of that fallback path isn't currently tracked anywhere.

## Related

[03_3D_ENGINE.md](03_3D_ENGINE.md) · [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md) · [06_CODING_STANDARDS.md](06_CODING_STANDARDS.md) · [milestone-2-architecture-rfc.md](milestone-2-architecture-rfc.md) · [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) · [18_ENGINEERING_CONTRACTS.md](18_ENGINEERING_CONTRACTS.md) · [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md) · [27_RC0_APPROVAL.md](27_RC0_APPROVAL.md) · [adr/](adr/)
