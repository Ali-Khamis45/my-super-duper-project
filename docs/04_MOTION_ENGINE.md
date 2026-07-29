# 04 — Motion Engine

Source of truth for every timing/easing/spring value used in motion, the shared pointer-gesture layer, and — from the target architecture section on — which of Framer Motion / GSAP / raw `useFrame` owns which kind of animation, and how they share a single timeline for scroll storytelling.

Same structure as [03_3D_ENGINE.md](03_3D_ENGINE.md): **current state** is built and running; **target architecture** is the Milestone 2 design, unbuilt, each piece tied to the milestone/checkpoint that builds it ([milestone-2-implementation-plan.md](milestone-2-implementation-plan.md)).

## Current state (Milestone 1, implemented)

### Layering

```
design-system/tokens/motion.ts   raw values mirrored from tokens.css (--ease-premium, --duration-*)
engine/motion/easings.ts         re-exports the CSS-mirrored curve(s) as Framer Motion-compatible values
engine/motion/durations.ts       re-exports the CSS-mirrored durations, converted ms -> seconds
engine/motion/springs.ts         spring physics configs — no CSS equivalent, defined only here
engine/motion/presets.ts         named, reusable Variants/configs built from the three above
engine/motion/gestures.ts        pointer-gesture hooks (magnetic, tilt) + shared normalization
```

### The catalogue

| Name | What it is | Used by |
|---|---|---|
| `fadeIn` | Opacity-only entrance | Nav chrome |
| `fadeUp` | Opacity + upward settle | Hero headline/subcopy |
| `pop` | Press feedback (`whileTap`) | Primary CTA |
| `stagger` | Parent variant for staggered children | Nav link list entrance |
| `float` | Idle-float period | The hero cup's 3D idle float (`CupAssembly`) |
| `useMagnetic` (gestures.ts) | Pointer-following pull toward the cursor | Primary CTA |
| `useTilt` (gestures.ts) | Pointer-driven 3D tilt | `GlowCard` hover |

`useMagnetic`/`useTilt` stay named with a `use` prefix (not re-exported as bare `magnetic`/`tilt`) so `eslint-plugin-react-hooks` recognizes them as hooks.

### Gesture normalization

`normalizePointer(clientX, clientY, rect)` in `gestures.ts` converts a pointer event to `[-1, 1]` coordinates relative to an element's center — shared by 2D (magnetic/tilt) and 3D (`useMouseParallax`, drag-rotate) pointer-driven motion.

### Reduced motion policy

Automatic/ambient animation (`fadeIn`/`fadeUp`/`stagger` entrances, the cup's idle `float`, `useTilt`) is skipped outright under `prefers-reduced-motion` — this project's convention is "disable, don't downgrade" (a half-motion compromise is often more disorienting than none). Direct-manipulation input (drag-to-rotate, keyboard rotation, `useMagnetic`'s pointer-follow while actively hovering) stays enabled — WCAG's reduced-motion guidance targets automatic motion, not user-initiated interaction.

---

## Target architecture (Milestone 2+, designed, not yet implemented)

### Ownership: which tool animates what

Three tools exist in the dependency tree today; only two are used. The rule that resolves "which one do I reach for," stated once so it's never re-litigated per component:

| Tool | Owns | Why |
|---|---|---|
| **Framer Motion** | DOM element entrances, hover/tap/press micro-interactions, anything discrete and component-scoped | Already the house style for Milestone 1's DOM motion; React-state-driven, which fits component-local interactions naturally |
| **Raw R3F `useFrame`** | Continuous 3D object animation where the *state is the frame-by-frame transform itself* — idle float, auto-rotate, inertia decay, steam rise, (Milestone 3) coffee/foam surface physics | These aren't React state — forcing them through `setState` would mean 60 renders/sec for no reason; `useFrame` mutating refs directly is the correct, already-proven pattern |
| **GSAP + ScrollTrigger** | Timeline-based sequencing — multiple coordinated steps triggered by scroll position or narrative beats | **Implemented, Sprint 3.7** (`features/storytelling/hooks/useScrollTimeline.ts`) — chapter-boundary detection and progress publishing, specifically (not scroll-scrubbed camera interpolation — see this doc's Camera paths section below for why). GSAP's timeline model fits this multi-step choreography in a way neither Framer variants nor hand-rolled `useFrame` does cleanly. Installed since Milestone 1, unused until Sprint 3.7 gave it a real job |

Nothing new is installed to make this work — GSAP has been a dependency since the project scaffold; it simply hasn't had a job yet.

### The shared progress bridge (`engine/state/createBridgeStore.ts`) — implemented, Sprint 2.1

Milestone 1 solved the same narrow problem three times independently — a value written on one side of a DOM/R3F boundary needs to be read on the other, without forcing a React re-render on every write: the dev-stats collector writing FPS for the DOM overlay to read, `useCupKeyboardControls` writing a rotation delta for `useCupInteractionState` to drain each frame, and `useMouseParallax` writing pointer position for `CameraRig` to read imperatively.

Generalized once, exactly as designed:

```ts
// engine/state/createBridgeStore.ts
export function createBridgeStore<T>(initial: T) {
  const store = create<{ value: T }>(() => ({ value: initial }));
  return {
    useValue: () => store((s) => s.value),       // reactive — DOM/Framer Motion consumers
    getValue: () => store.getState().value,        // imperative — useFrame consumers
    setValue: (value: T) => store.setState({ value }),
  };
}
```

The dev-stats store and the keyboard-rotation store are migrated onto it. `useMouseParallax` still writes to a plain ref rather than a bridge store — its consumer (`CameraRig`) never needs the *reactive* `useValue()` half, so the extra indirection wasn't worth it there; not every DOM/R3F-boundary value needs to be a full bridge store, only the ones with a real reactive consumer on the other side.

**`scrollProgress` is now populated, Sprint 3.7** — `features/storytelling/hooks/useScrollTimeline.ts`'s page-spanning `ScrollTrigger.onUpdate: (self) => scrollProgress.setValue(self.progress)` is the real first caller, exactly the wiring this doc sketched back in Sprint 2.1. The store itself (`engine/state/scrollProgress.ts`) was left deliberately uncreated until this sprint gave it a real consumer — see [reviews/sprint-2.1-review.md](reviews/sprint-2.1-review.md) for that original reasoning.

### Lenis + GSAP integration — Implemented, Sprint 3.7

Lenis (smooth scroll) and GSAP's `ScrollTrigger` each want to own the scroll-driven raf loop; running both independently desyncs them (visible jank, mistimed triggers). Built exactly as documented here, inside `SmoothScrollProvider.tsx`:

```ts
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

GSAP's ticker is the single driver (`ReactLenis`'s `autoRaf: false`); Lenis no longer runs its own internal `requestAnimationFrame` loop. Mounted globally (every route already goes through `SmoothScrollProvider`), not conditionally per-route — inert everywhere no `ScrollTrigger` is registered (an idle `ScrollTrigger.update()` call with zero triggers is a no-op), and functionally identical scroll smoothness for every route that isn't `/story`. Reduced motion still skips Lenis entirely (unchanged) — `features/storytelling/`'s own reduced-motion path also never registers a scroll-scrubbed `ScrollTrigger`, so the two stay consistent.

### Camera paths — resolved differently in Sprint 3.7, not built as anticipated

This section anticipated a `CameraPath` (an ordered list of keyframe presets) and `CameraRig` accepting `path={{ name, progress: scrollProgress.getValue() }}`, interpolating between keyframes instead of damping toward a single preset. **Not built** — Sprint 3.7's actual brief was explicit instead: *"Add cinematic camera paths. Reuse Camera Manager. Do not modify Camera contracts. Implement through new presets only."* Verified directly against `CameraRig.tsx`'s real implementation before choosing a design: it only re-resolves its target preset at React render time, not per-frame, so a continuously-updated computed preset would never actually be picked up without forcing `CameraRig` to re-render every scroll frame — a real performance regression its own frame loop is built to avoid. Built instead: each of `features/storytelling/`'s 7 chapters switches to its own real, registered `CameraPresetName` at a chapter boundary (a discrete narrative beat), and `CameraRig`'s existing, completely unmodified damped preset-to-preset interpolation (built Sprint 2.1) provides the smooth-glide feel — continuous, scroll-scrubbed motion within a chapter (the assembly moment, the ingredient orbit, the shader density boost) lives entirely in `CupAssembly`'s own damping and the shared uniform block, never in the Camera Manager. `engine/camera/paths.ts` and `CameraRig`'s `path` prop remain undesigned in code — the real design for a future sprint that specifically wants continuous, per-pixel camera scrubbing rather than per-chapter discrete moves. See [26_API_STABILITY.md](26_API_STABILITY.md)'s `CameraPathName` row for the full reasoning.

### Coffee/foam liquid physics (Sprint 3.4) — not a physics engine

**Implemented, Sprint 3.4, exactly as designed here**: a lightweight, custom `useFrame`-driven surface simulation (`engine/physics/liquidPhysics.ts`'s `stepLiquidPhysics`) — spring-damper tilt responding to the cup's rotation velocity, sine-wave ripples, plus foam/ice as slower spring followers of the same tilt signal — not a general rigid-body engine (Rapier, Cannon, Ammo, PhysX; this sprint's own brief named and excluded all of them explicitly). A full physics engine would be a meaningful new dependency and complexity cost for what's cosmetically a liquid-surface wobble, not real fluid dynamics. This stays firmly in the "raw `useFrame`" ownership lane above — one `useFrame` in `features/hero-cup/hooks/useLiquidPhysics.ts`, called once per `CupAssembly` mount regardless of how many parts read its output; it did not need GSAP or a new manager.

**Interface extension, landed as predicted** (identified during the [Architecture Freeze](15_ARCHITECTURE_FREEZE.md), scenario "Coffee Liquid Physics"): `useCupInteractionState`'s return object gained a `velocityRef` field alongside `state`/`rotationYRef`/`bind` — additive, every pre-Sprint-3.4 consumer (`CupAssembly`) unaffected, the sanctioned extension path under [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md). One refinement beyond the original plan: `velocityRef` is now also driven by keyboard rotation (previously only drag/touch), and decays back to 0 on its own outside the drag-release inertia-coast state — needed so keyboard users get the identical liquid-tilt/ripple response a drag produces ("Keyboard users must experience the same visual state transitions," this sprint's own accessibility requirement), not a silently-inert velocity signal.

**Adaptive quality**: `engine/performance/qualityPolicy.ts`'s `coffeePhysics` policy (`intensity`/`maxActiveRipples`/`secondaryMotion`) scales the simulation per tier — reshaped from the original placeholder `coffeePhysicsQuality: "off" | "full"` field (zero real callers before this sprint) into a graded scale, since "off" at any tier would have repeated this table's one documented boolean exception (`bloomEnabled`) a second time, contradicting this sprint's explicit "never disable physics entirely."

See [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md)'s Coffee/Foam sections for the shader-side half, and [reviews/sprint-3.4-review.md](reviews/sprint-3.4-review.md) for the full sprint review.

### Reduced motion in GSAP timelines

GSAP ships `gsap.matchMedia()` specifically for this — a context scoped to `(prefers-reduced-motion: no-preference)`, so reduced-motion users get the end-state of a scroll narrative without the scrubbed/pinned journey, consistent with this project's existing "disable outright" policy (not a slower or simplified version of the same animation).

### Independent animation modules

Each animation — steam's rise-and-fade, the cup's idle float, `features/storytelling/`'s `ScrollTrigger` timeline — stays a self-contained module that doesn't need to know another one exists (steam's `useFrame` has no awareness of `CupAssembly`'s own part-displacement damping, and vice versa). This isn't a new rule; it's already true of every Milestone 1 animation and is worth stating explicitly so it stays true as the number of concurrent animations grows — a future contributor should never need to trace cross-module animation dependencies to change one.

## Related

[milestone-2-architecture-rfc.md](milestone-2-architecture-rfc.md) · [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) · [03_3D_ENGINE.md](03_3D_ENGINE.md) · [reviews/sprint-2.1-review.md](reviews/sprint-2.1-review.md) · [adr/0004-motion-engine.md](adr/0004-motion-engine.md) · [adr/0007-animation-orchestration.md](adr/0007-animation-orchestration.md) · [02_DESIGN_SYSTEM.md](02_DESIGN_SYSTEM.md)
