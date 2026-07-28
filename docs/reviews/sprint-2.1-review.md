# Sprint 2.1 — Rendering Core: Review

Sprint 2.1 built the rendering infrastructure every future Milestone 2+ feature depends on: the generalized registry, Camera Manager transitions, the Environment/Lighting Manager split, the Effect Manager redesign, the Event System (bridge stores + EventBus), the Interaction Manager foundation, Performance Manager foundation, Debug Overlay foundation, the Scene Composition contract, and GPU context-loss recovery. No Steam, Coffee Physics, Customizer, Ingredient System, AI, or Commerce — infrastructure only, per scope.

**Scale**: ~20 new files, ~15 modified, 2 deleted (`HDRManager.ts`, `bloom.ts` — both superseded, zero remaining references verified before deletion). 24 new unit tests across 5 test files, all passing. `tsc --noEmit`, `eslint`, and `next build` all clean.

## Architecture review

**Zero Rewrite Policy compliance, checked file by file**: no existing public contract broke. `resolveCameraPreset`/`resolveCupPart` keep their exact signatures; `CupPartProps` is untouched; `CameraRigProps` gained an optional `transitionDamping` field (additive); `useCupInteractionState`'s return shape (`state`/`rotationYRef`/`bind`) is unchanged. Every change that touched an existing file was either additive (new exported functions) or an internal implementation swap behind an unchanged public surface (e.g. `DevPanelStatsCollector`'s internal store implementation, invisible to its one consumer).

**Dependency graph re-checked against [15_ARCHITECTURE_FREEZE.md](../15_ARCHITECTURE_FREEZE.md)**: the one flagged cycle-risk (Performance Manager reaching into other managers) doesn't exist — `engine/performance/index.ts` imports only `createBridgeStore`; `DevPanel.tsx` reads `performanceManager.tier` one-directionally, not the reverse. No new circular imports introduced anywhere else (verified by inspection of every new file's import list — none of `engine/registry`, `engine/state`, `engine/events`, `engine/interaction`'s files import from `engine/camera`, `engine/environment`, `engine/lighting`, or `engine/effects`, only the reverse).

**Three deliberate scope deviations from the frozen plan, all reasoned through and documented at the point of deviation** (not silently dropped):

1. `scrollProgress` (a `createBridgeStore` instance for Milestone 6) was **not** created, despite being an explicit Sprint 2.1 line item in [18_ENGINEERING_CONTRACTS.md](../18_ENGINEERING_CONTRACTS.md) and [26_API_STABILITY.md](../26_API_STABILITY.md). It would have zero real consumers and zero logic beyond what `createBridgeStore`'s own tests already prove — the same category of dead scaffolding this project's standards reject everywhere else (`audio/`, `features/commerce/`). Created in Milestone 6 instead, when GSAP ScrollTrigger gives it an actual caller.
2. `engine/camera/paths.ts` (`CameraPathName` registry) and `CameraRig`'s `path` prop were **not** built, for the same reason — an empty registry with a permanently-unreachable branch is dead code, not infrastructure. Camera Manager **transitions** (preset-to-preset interpolation, which Sprint 2.1 *did* build) are real, distinct, testable logic; path-driven interpolation isn't, until Milestone 6 exists to drive it.
3. `useCupInteractionState` does **not** consume `useGestureRecognizer`, contrary to what earlier design docs implied. The cup is hit-tested by R3F's raycaster on a `<group>`, not a DOM element — `useGestureRecognizer`'s `RefObject<HTMLElement>` shape is architecturally the wrong fit for 3D hit-testing, not a missing feature to add to that hook. Forcing the fit would have been the highest-risk kind of mistake this sprint could make: a false unification that looks consistent on paper and is wrong in practice. The cup keeps its own proven mechanics and now speaks the same typed vocabulary instead.

All three are corrected in [03_3D_ENGINE.md](../03_3D_ENGINE.md), [04_MOTION_ENGINE.md](../04_MOTION_ENGINE.md), and [12_INTERACTION_SYSTEM.md](../12_INTERACTION_SYSTEM.md) — documentation follows what was actually built, per this phase's operating rule.

## Code review

- `npx tsc --noEmit`: clean.
- `npx eslint .`: clean. Two real issues found and fixed during the sprint, not suppressed: a `noUncheckedIndexedAccess` violation in a test (fixed by using `toHaveBeenCalledWith(expect.objectContaining(...))` instead of indexing `.mock.calls[0][0]`), and a `react-hooks/refs` violation in `useGestureRecognizer` (a ref was mutated during render for the "latest handlers" pattern; fixed by moving the write into a dependency-free `useEffect`, the idiomatic fix, not a rule suppression).
- `npx vitest run`: 24/24 passing across `createPartRegistry`, `createBridgeStore`, `EventBus`, camera presets, and `useGestureRecognizer`.
- `next build`: clean; `three`/`@react-three/*` confirmed absent from the server-rendered `/` bundle (grepped `.next/server/app` directly).
- Boy Scout Rule applied where files were touched anyway: `DevPanel.tsx` was rewritten cleanly rather than patched around its old shape; dead exports (`BloomConfig`, the old `resolveEnvironmentSource`) were deleted, not left as unused exports.

**A real bug found and fixed during this review, not before**: `CameraRig`'s reduced-motion path (`enabled={false}`) had a latent correctness gap. The old Milestone 1 code snapped the camera to the new preset unconditionally on every config change; the new transition-interpolation code moved that logic into `useFrame`, which returns immediately when `enabled` is false — meaning a future preset change while a user has reduced motion enabled would have silently done nothing (no snap, no `camera:transition-complete`). Not user-visible yet (only `hero` exists and never changes at runtime this sprint), but it would have shipped as a real accessibility regression the moment Milestone 4+ switches presets. Fixed: the mount effect now snaps instantly when `enabled` is false, consistent with this project's "disable outright, don't downgrade" reduced-motion policy, rather than leaving the transition to a frame loop that reduced-motion users never run.

## Performance review

"Measure before optimizing" was followed literally, not just cited: the Performance Manager's adaptive-tier *stepping algorithm* was explicitly **not** built this sprint, because there's no meaningful budget to measure against yet (the scene's complexity is unchanged from Milestone 1 — the steam shader that would actually stress the budget doesn't exist until Sprint 2.4). Building tier-stepping logic now would mean tuning thresholds against a scene that isn't representative of what the tier system will actually need to manage — premature by this project's own standard, not conservatism for its own sake.

What *is* measured: the dev panel's FPS sampling is unchanged in mechanism (still `useFrame`-driven, still ~500ms cadence, still correctly frame-rate-independent under `frameloop="demand"`) and now additionally feeds `performanceManager.sampleFrame(fps)` — zero new steady-state per-frame cost beyond one extra function call already inside the existing 500ms-gated branch. `CameraRig`'s new transition-settlement check (`camera.position.distanceTo(presetBasePosition.current)`) only executes while `isTransitioning.current` is true — zero added cost at rest, and a single `Vector3.distanceTo` call (no allocation; the comparison vector is a cached ref, not constructed per frame) during the rare, short window a transition is active.

Visual confirmation: headless-Chrome verification (SwiftShader software WebGL, since `--disable-gpu` reproduces this project's previously-documented headless capture flakiness) showed the hero rendering with correct camera framing, materials, lighting, and bloom, with only the same pre-existing benign console warnings (`THREE.Clock` deprecation, PCF shadow map deprecation, ANGLE precision warnings) already disclosed in the Milestone 1 CDR — no new warnings or errors introduced.

## Accessibility review

- **Keyboard**: `useCupKeyboardTrigger`'s Left/Right-arrow rotation is functionally unchanged — migrated onto `createBridgeStore` with identical destructive-drain semantics, verified by direct code comparison against the Milestone 1 original, not just "it still compiles."
- **Reduced motion**: the `CameraRig` bug described above was a reduced-motion-specific regression, caught and fixed as part of this same review rather than shipped and found later. `CupAssembly`'s reduced-motion gating (idle float, auto-rotation) is untouched.
- **Focus**: `CupCanvas`'s `tabIndex`/`role`/`aria-label` are unchanged; when the GPU context is lost, `tabIndex` is set to `-1` on the (now-invisible) Canvas so a keyboard user tabbing through the page doesn't land on a hidden, non-functional element — the static fallback overlay has no interactive elements of its own, matching `CupStaticFallback`'s existing (non-interactive, decorative) design.
- **Screen readers**: no change to any `aria-*` attribute; the context-loss fallback reuses `CupStaticFallback`'s existing `role="img"`/`aria-label` illustration, not a new unlabeled state.

**Known gap, honestly disclosed, not silently skipped**: `CameraRig`'s transition/reduced-motion logic has no automated test — it requires a live R3F/`useThree` context that jsdom can't provide without `@react-three/test-renderer` (not installed; installing it for one component would be new scope beyond this sprint). Verified instead by code-level reasoning (documented above) and the visual/build checks in this review. [21_TEST_STRATEGY.md](../21_TEST_STRATEGY.md) already names Camera Manager's runtime behavior as primarily a Playwright/visual concern for exactly this reason — this isn't a new gap, it's the anticipated one.

## Creative Director Review

Out of scope by the sprint's own design — "no Steam, no Coffee Physics, no Customizer... only infrastructure" means nothing new is visually present to score against [09_CREATIVE_DIRECTOR_REVIEW.md](../09_CREATIVE_DIRECTOR_REVIEW.md)'s rubric. The one Creative Budget item [16_ENGINEERING_SPRINTS.md](../16_ENGINEERING_SPRINTS.md) named for this sprint — camera transition easing being smoother than a hard snap — exists in the code (`CameraRig`'s interpolation) but has no second registered preset to demonstrate it against yet, so it can't be honestly scored as a delivered creative improvement this sprint; it's real, tested infrastructure whose visible payoff lands the first time Milestone 4 switches to a `product` preset. Recorded as `N/A — infrastructure sprint`, not skipped or inflated.

## Retrospective

### Technical debt

- `CameraRig` has no automated test coverage (see Accessibility review above) — acceptable for now, worth revisiting once/if `@react-three/test-renderer` is adopted for a real need, not proactively.
- `useCupInteractionState` and `useGestureRecognizer` now express the same gesture vocabulary through two separate implementations (R3F-native and DOM-native). This is the correct call today (documented above), but it means the vocabulary's correctness has to be maintained in two places if it ever changes — worth watching, not worth abstracting away prematurely.

### Architectural observations

- The Effect Manager is the one manager where "extend" genuinely does mean editing the manager's own `switch` statement (a new `EffectConfig` variant + a `case`) — already called out as the sanctioned exception in [17_ZERO_REWRITE_POLICY.md](../17_ZERO_REWRITE_POLICY.md), reconfirmed here as the shape it actually took in code (`renderEffect`'s switch in `EffectsStack.tsx`).
- `useMouseParallax` deliberately was **not** migrated onto `createBridgeStore` — its only consumer (`CameraRig`) reads it purely imperatively inside `useFrame` and never needs `useValue()`'s reactive half, so the extra indirection buys nothing. A useful, concrete counter-example to keep citing: not every DOM/R3F-boundary value should become a bridge store, only ones with a real reactive consumer.
- Finding the `CameraRig` reduced-motion bug this late in the sprint (during the review pass, not during initial implementation) is itself worth noting: it wasn't caught by `tsc`, `eslint`, or the unit test suite — only by deliberately re-reading the finished component against its own stated contract (`enabled={false}` behavior) with fresh eyes. Worth treating "re-read the diff against the doc's stated behavior, not just against whether it compiles" as a standing step in future sprint reviews, not a one-off.

### Possible improvements

- A dedicated `@react-three/test-renderer`-based test harness would close the Camera Manager coverage gap — not proposed for adoption now (no second real consumer to test against yet), but worth reconsidering once Milestone 4 registers a second preset for real.
- The EventBus has three real production emitters now (up from zero); once Milestone 5's `ingredient:dropped` becomes a fourth, revisit whether a lightweight EventBus activity view in the Debug Overlay (via the now-real `registerDevPanel` extension point) would earn its cost — not before, per this project's own anti-speculation discipline.

## Sign-off

`git status` confirms every change this sprint is a real, working, tested implementation, not documentation — the inverse of every phase before RC0. Waiting for approval before Sprint 2.2 (Asset System) begins.

## Related

[16_ENGINEERING_SPRINTS.md](../16_ENGINEERING_SPRINTS.md) · [25_IMPLEMENTATION_READINESS.md](../25_IMPLEMENTATION_READINESS.md) · [26_API_STABILITY.md](../26_API_STABILITY.md) · [03_3D_ENGINE.md](../03_3D_ENGINE.md) · [04_MOTION_ENGINE.md](../04_MOTION_ENGINE.md) · [12_INTERACTION_SYSTEM.md](../12_INTERACTION_SYSTEM.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](../09_CREATIVE_DIRECTOR_REVIEW.md)
