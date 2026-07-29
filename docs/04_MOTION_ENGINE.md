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
| **GSAP + ScrollTrigger** | Timeline-based sequencing — multiple coordinated steps triggered by scroll position or narrative beats (Scroll Storytelling, Milestone 6) | GSAP's timeline model (named labels, precise offsets, multiple simultaneous targets) fits multi-step choreography in a way neither Framer variants nor hand-rolled `useFrame` does cleanly. Installed since Milestone 1, unused until this is the actual job |

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

**`scrollProgress` was deliberately not created this sprint**, despite being sketched here and approved as a Sprint 2.1 deliverable during RC0. It would have zero real consumers until GSAP ScrollTrigger exists (Milestone 6) and adds no logic beyond what `createBridgeStore`'s own tests already prove — a genuinely inert, zero-behavior file, unlike the camera transition interpolation built this same sprint (real, testable logic with no live production caller yet, but not *zero* logic either). See this sprint's retrospective ([reviews/sprint-2.1-review.md](reviews/sprint-2.1-review.md)) for the full reasoning. `ScrollTrigger`'s `onUpdate: (self) => scrollProgress.setValue(self.progress)` wiring below is still the correct design for Milestone 6, when the instance is actually created.

### Lenis + GSAP integration

Lenis (smooth scroll) and GSAP's `ScrollTrigger` each want to own the scroll-driven raf loop; running both independently desyncs them (visible jank, mistimed triggers). The documented, correct wiring:

```ts
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

GSAP's ticker becomes the single driver; Lenis stops running its own internal `requestAnimationFrame` loop. This wiring lives in `SmoothScrollProvider` (already reduced-motion-gated — nothing changes there) and only activates once a route actually uses `ScrollTrigger`, i.e., Milestone 6, not before.

### Camera paths — the 3D side of storytelling

Wired directly to [03_3D_ENGINE.md](03_3D_ENGINE.md)'s Camera Manager design: a `CameraPath` will be an ordered list of keyframe presets; `CameraRig` will accept `path={{ name, progress: scrollProgress.getValue() }}` and interpolate between keyframes instead of damping toward a single preset. **Not built in Sprint 2.1** despite earlier sketches implying it would be scaffolded then — `engine/camera/paths.ts` and the `path` prop don't exist yet. Camera Manager transitions (which Sprint 2.1 *did* build — preset-to-preset interpolation) are a real, distinct capability from path-driven interpolation; scaffolding an empty path registry with a permanently-unreachable `path` prop branch would have been the same category of dead code as a standalone `scrollProgress` store, so both were deferred together to Milestone 6, when GSAP ScrollTrigger gives them an actual caller.

### Coffee/foam liquid physics (Sprint 3.4) — not a physics engine

**Implemented, Sprint 3.4, exactly as designed here**: a lightweight, custom `useFrame`-driven surface simulation (`engine/physics/liquidPhysics.ts`'s `stepLiquidPhysics`) — spring-damper tilt responding to the cup's rotation velocity, sine-wave ripples, plus foam/ice as slower spring followers of the same tilt signal — not a general rigid-body engine (Rapier, Cannon, Ammo, PhysX; this sprint's own brief named and excluded all of them explicitly). A full physics engine would be a meaningful new dependency and complexity cost for what's cosmetically a liquid-surface wobble, not real fluid dynamics. This stays firmly in the "raw `useFrame`" ownership lane above — one `useFrame` in `features/hero-cup/hooks/useLiquidPhysics.ts`, called once per `CupAssembly` mount regardless of how many parts read its output; it did not need GSAP or a new manager.

**Interface extension, landed as predicted** (identified during the [Architecture Freeze](15_ARCHITECTURE_FREEZE.md), scenario "Coffee Liquid Physics"): `useCupInteractionState`'s return object gained a `velocityRef` field alongside `state`/`rotationYRef`/`bind` — additive, every pre-Sprint-3.4 consumer (`CupAssembly`) unaffected, the sanctioned extension path under [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md). One refinement beyond the original plan: `velocityRef` is now also driven by keyboard rotation (previously only drag/touch), and decays back to 0 on its own outside the drag-release inertia-coast state — needed so keyboard users get the identical liquid-tilt/ripple response a drag produces ("Keyboard users must experience the same visual state transitions," this sprint's own accessibility requirement), not a silently-inert velocity signal.

**Adaptive quality**: `engine/performance/qualityPolicy.ts`'s `coffeePhysics` policy (`intensity`/`maxActiveRipples`/`secondaryMotion`) scales the simulation per tier — reshaped from the original placeholder `coffeePhysicsQuality: "off" | "full"` field (zero real callers before this sprint) into a graded scale, since "off" at any tier would have repeated this table's one documented boolean exception (`bloomEnabled`) a second time, contradicting this sprint's explicit "never disable physics entirely."

See [13_SHADER_ARCHITECTURE.md](13_SHADER_ARCHITECTURE.md)'s Coffee/Foam sections for the shader-side half, and [reviews/sprint-3.4-review.md](reviews/sprint-3.4-review.md) for the full sprint review.

### Reduced motion in GSAP timelines

GSAP ships `gsap.matchMedia()` specifically for this — a context scoped to `(prefers-reduced-motion: no-preference)`, so reduced-motion users get the end-state of a scroll narrative without the scrubbed/pinned journey, consistent with this project's existing "disable outright" policy (not a slower or simplified version of the same animation).

### Independent animation modules

Each animation — steam's rise-and-fade, the cup's idle float, a future ScrollTrigger timeline — stays a self-contained module that doesn't need to know another one exists (steam's `useFrame` has no awareness of the camera path's `useFrame`, and vice versa). This isn't a new rule; it's already true of every Milestone 1 animation and is worth stating explicitly so it stays true as the number of concurrent animations grows — a future contributor should never need to trace cross-module animation dependencies to change one.

## Related

[milestone-2-architecture-rfc.md](milestone-2-architecture-rfc.md) · [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) · [03_3D_ENGINE.md](03_3D_ENGINE.md) · [reviews/sprint-2.1-review.md](reviews/sprint-2.1-review.md) · [adr/0004-motion-engine.md](adr/0004-motion-engine.md) · [adr/0007-animation-orchestration.md](adr/0007-animation-orchestration.md) · [02_DESIGN_SYSTEM.md](02_DESIGN_SYSTEM.md)
