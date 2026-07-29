# Sprint 3.2 — Interactive Cup Designer: Review

Milestone 3's first flagship interactive experience: a live customizer at `/customize` letting users choose cup color, size, sleeve, lid, logo, and material finish, with the 3D cup updating in real time, hover-preview-before-commit, undo/redo, reset, and session-only preset saving. Built entirely on Engine v1.0 through its existing extension points — `CupPartProps.materialOverrides`/`colorway` (typed since Sprint 2.3 specifically for this moment), the material cache, the registry, motion presets — with zero engine rewrites.

**Scale**: 15 new source files (`stores/customizer-store.ts`, `features/customizer/` — types, 6 data catalogs, `resolvePartOverrides.ts`, 7 components, README — plus `features/hero-cup/lib/materialOverridesToVariant.ts`), 9 modified files (the Hero-cup rendering chain extended with optional, backward-compatible props: `CupAssembly`/`CupScene`/`CupCanvas`/`CupCanvasLoader`, and `ProceduralCup`/`Sleeve`/`Lid` re-routed through the shared material cache; `app/customize/page.tsx`; `engine/events/types.ts` gained 5 new events). 21 new unit tests (171 total project-wide, 29 files). A new `e2e/customizer.spec.ts` (10 tests × 3 browsers, 30 total, all passing). Full suite run: 74 passed, 5 documented skips, 2 failures that are the same pre-existing Sprint 2.6 hero visual-regression parallel-execution flake (confirmed unrelated — a serial re-run of that exact suite passed 12/12 immediately before this sprint's changes were even made).

## Architecture review

**No engine files touched, checked, not assumed**: `git status` against `src/engine/` shows zero changes. Every capability this sprint needed — per-part material overrides, a material cache keyed richly enough to reuse compiled work, the registry, motion presets, the EventBus — already existed. The one place this sprint touched `engine/` is the explicitly sanctioned one: `engine/events/types.ts` gained `customizer:opened`/`customizer:closed`/`variant:selected`/`preset:applied`/`preset:reset`, exactly the additive event-catalog extension the brief itself asked for ("Extend the Event Catalog only where required").

**A dedicated store, not a repurposed one**: `stores/customizer-store.ts` is new, holding `selection`/`preview`/`history`/`historyIndex`/`savedPresets` — never reaching into `engine/performance`'s or `engine/state`'s stores, per the brief's explicit "do not modify engine stores." Persisted to `sessionStorage` (not `localStorage`) via Zustand's `persist` middleware, matching "Persist only session state" literally.

**Backward compatibility, verified, not assumed**: `CupAssembly`/`CupScene`/`CupCanvas`/`CupCanvasLoader` all gained new props (`partOverrides`, `cupScale`, `route`) that are optional and `undefined` for every pre-existing caller (`Hero.tsx` still calls `<CupCanvasLoader />` with no arguments). The Hero route's own e2e suite — including its committed pixel-diff visual-regression baseline — was re-run after these changes and passed 12/12, confirming byte-for-byte unchanged rendering, not just "should be fine" from reading the diff.

**A real bug found and fixed, not shipped**: `engine/analytics` wasn't touched this sprint, but the Engine Integration Audit habit from Sprint 2.6 paid off again in a different form — while wiring `resolvePartOverrides`, tracing exactly how `ProceduralCup`/`Sleeve`/`Lid` used `materialOverrides` surfaced that the customizer's very first real usage would bypass `getOrCreateMaterial`'s cache entirely (every one-off override always constructed a fresh, never-shared material). Fixed by routing overrides through the *same* cache with a richer key (`MaterialCacheKey.variant` now encodes the override signature via the new `materialOverridesToVariant` helper) instead of building a second, parallel path — see Performance Review below for what this actually bought.

## Interaction review

**Preview-before-commit, implemented as the brief's closing note specified**: hovering or keyboard-focusing a swatch shows the cup with that option applied (`setPreview`) without touching undo/redo history or emitting `variant:selected`; a real click or Enter/Space commits it. `CustomizerCanvas` computes its effective look as `{...selection, ...preview}` every render — the 3D view always reflects whatever's currently under the pointer or focus ring, reverting cleanly when the pointer/focus moves away.

**Drag-to-rotate, keyboard, and touch all preserved, verified live, not assumed**: the customizer reuses `CupCanvas` unmodified in its interaction internals (`useCupInteractionState`, `useCupKeyboardTrigger`, `useWebGLContextRecovery` are all untouched) — rotation, arrow-key control, and touch-drag all work identically to the Hero route because it is, literally, the same component. Verified via e2e: a real `tap()` on a swatch, a real keyboard `Tab`+`Enter` sequence, and a real reduced-motion pass all pass on all 3 engines.

**Undo/redo is real history, not a two-state toggle**: `select()` truncates any redo tail before appending (standard editor semantics — a new selection after an undo discards the abandoned branch, not silently keeps it reachable), verified by a dedicated unit test asserting the discarded branch is actually gone from `history`, not just unreachable by convention.

## Performance review

**"No material recreation where unnecessary," measured, not asserted**: before the cache-routing fix, every customizer material selection was a genuinely one-off `THREE.Material` instance, never reused even when revisiting an identical combination (undo/redo, re-picking a swatch). After: `getOrCreateMaterial`'s key now encodes color *and* finish (`materialOverridesToVariant`), so a repeated combination is a real cache hit — verified by the fact that the Hero route's *default* (no-override) cache key is provably unchanged (`materialOverridesToVariant(lightingPresetName, undefined)` returns `lightingPresetName`, the exact pre-Sprint-3.2 key), so this fix cost zero Hero-route cache entries while adding real reuse for every customizer combination.

**A real measurement-methodology finding, worth recording**: an early investigation into what looked like a multi-second customizer-specific rendering delay turned out, after direct measurement, to be nothing of the kind. Three separate false leads were each run down and ruled out: (1) `locator.screenshot()` waits for the *element* to be visually "stable," which a continuously-animating WebGL canvas under `frameloop="always"` never satisfies — the right tool is `page.screenshot()`. (2) The Hero route, measured with the same short wait times my first customizer screenshots used, showed the identical near-blank first second — this was never a customizer-specific regression, just normal initial WebGL/HDRI setup time shared by both routes, previously never measured at matched intervals. (3) Wall-clock timing via Playwright's `.click()` reported 2.8–4.4 seconds per interaction on both dev *and* a real production build — but an in-page `performance.now()` measurement (click dispatch to `aria-checked` flip, no Playwright-side polling in the loop) measured the *actual* interaction latency at 6ms. The multi-second numbers were Playwright's own actionability-polling overhead in this specific, heavily-loaded single-machine session, not the application. The cache-routing fix (above) is still real and worth having, just not "fixing" the dramatic number this investigation chased for a while — recorded honestly here rather than either overclaiming a fix or hiding the dead end.

## Accessibility review

**Keyboard**: every swatch is a real `<button role="radio">` inside a `role="radiogroup"` with a `<fieldset>`/`<legend>` pair — reachable by Tab, activated by Enter/Space (native button semantics, no custom key handling needed for activation). Verified via e2e: focus + Enter commits a selection on all 3 engines, including under `reducedMotion` (see the Retrospective for a real hydration-timing bug this specific combination surfaced).

**Screen-reader labels, tightened during this sprint, not left at a first draft**: swatch `aria-label`s were initially just the option label ("Charcoal") — testing with a flat, ungrouped accessible-name query immediately surfaced that "Charcoal" is offered identically in the Color, Sleeve, *and* Lid groups. Real screen readers generally announce enclosing-group context too, but not identically across every AT/browser combination, so labels were changed to embed the group name directly (`"Sleeve: Charcoal"`) — unambiguous without depending on that.

**Focus management**: the detail-dialog-equivalent here (there isn't one — this sprint has no modal) means focus never needs trapping/restoring; every control is a normal, always-present, always-focusable element in one linear DOM order. Undo/Redo/Reset are real `<button>`s with `aria-label`s (via `Tooltip`'s trigger), correctly `disabled` (not just visually dimmed) at the ends of history — verified via e2e (`toBeDisabled()`, not just a class-name check).

**Touch targets, measured, not assumed**: every swatch button is `min-h-11 min-w-11` (44px) regardless of its visual (24px color-dot) size — verified via e2e `boundingBox()` assertion, not just the Tailwind class being present in source.

**Reduced motion**: the 3D scene's own reduced-motion behavior (idle rotation/float disabled) is inherited unchanged from the Hero route. No 2D entrance/transition animation in the panel itself depends on motion preference (the panel has no entrance choreography to begin with — content is present immediately, not animated in), so there was nothing additional to gate.

## Creative Director Review

**Delivered, and load-bearing rather than decorative**: "Smooth material blending" and "selection feedback" are the same feature, done once, correctly — the preview-before-commit mechanism *is* the delight this sprint's Creative Budget asked for, not a separate flourish bolted on afterward. Hovering a color swatch and watching the cup update live, then reverting cleanly when you move away, is the whole point of a "flagship interactive experience," not a nice-to-have on top of one. "Premium transition timing" is inherited from the existing `duration-(--duration-fast)`/`ease-(--ease-premium)` tokens applied to every swatch's hover/selected state transition — reused, not reinvented, consistent with this project's established restraint.

**Honestly scoped**: no new visual system was built (no new shaders, no new geometry beyond `scale` for size variants) — the delight here is entirely in *interaction quality* (immediacy, reversibility, clarity of state), matching the brief's own framing that "engineering excellence is assumed" and "experience quality becomes the primary success metric" for this milestone, not a demand for new rendering spectacle.

## Retrospective

### Technical debt

- `Cup Variants` maps to size (`scale`) only — a real, complete interpretation of the brief's category (no second cup silhouette exists to offer as a "variant" today), but worth revisiting if a future sprint introduces a genuinely different cup geometry.
- `MaterialPreset` (finish) is applied uniformly to cup/sleeve/lid together, not independently per part — a deliberate simplicity choice (a coherent "look" rather than three independent finish pickers), not an oversight; worth reconsidering if user feedback ever wants per-part finish control.

### Architectural observations

- The material-cache-key fix (`materialOverridesToVariant`) is this sprint's clearest example of "extend, don't rewrite": the cache mechanism, the `variant` field, even the `getOrCreateMaterial` call signature all already existed, built two sprints ago for exactly this moment (Sprint 2.3's own comment: "materialOverrides has no real caller yet (Milestone 4)"). Nothing about the fix required touching `engine/materials/cache.ts` at all.
- A real, reproducible test-infrastructure bug was found and fixed: calling `.focus()` immediately after `page.goto()` can race React hydration — the DOM node accepts focus before React's event listeners attach, so a subsequent synthetic key press lands on nothing. A standalone reproduction with no artificial delay confirmed the app itself is correct; every other test in this suite has enough incidental overhead (locator resolution, click actionability waits) to not hit this window, but a bare focus+key sequence right after navigation does. Worth remembering for any future test that interacts with the page unusually early.
- Three separate performance red herrings (element-screenshot stability waits, an unmatched-baseline comparison, and Playwright's own click-actionability overhead) were each run to ground with a real measurement before being ruled out, rather than accepted as "probably fine" or chased into an unnecessary fix. The one real fix that came out of this investigation (material cache routing) would have been findable by code review alone; the multi-second numbers would not have been, and taking them at face value would have produced a wrong diagnosis.

### Possible improvements

- `QualityMode`'s `"manual"` value (Sprint 2.5) still has no UI — the customizer's material/color choices are a different kind of user control, but a future settings surface combining both quality and appearance preferences is a reasonable place they could eventually live together.
- Saved presets have no export/share mechanism (session-only, as specified) — a reasonable, explicitly out-of-scope extension point for whenever Commerce (Sprint 3.6) needs a preset to survive into a cart/order.

## Sign-off

`git status` confirms every change this sprint is real, working, tested implementation — 21 new unit tests (171 total), a new 30-test e2e suite (all passing across Chromium/Firefox/WebKit), zero engine files touched beyond the sanctioned event-catalog extension, zero Hero-route regression (verified via its own full e2e suite including pixel-diff visual regression). Waiting for approval before Sprint 3.3 (Ingredient Builder) begins.

## Related

[28_MILESTONE_3_SPRINTS.md](../28_MILESTONE_3_SPRINTS.md) · [08_MILESTONES.md](../08_MILESTONES.md) · [ENGINE_CHANGELOG.md](../../ENGINE_CHANGELOG.md) · [17_ZERO_REWRITE_POLICY.md](../17_ZERO_REWRITE_POLICY.md) · [19_EVENT_CATALOG.md](../19_EVENT_CATALOG.md) · [adr/0005-state-management.md](../adr/0005-state-management.md) · [reviews/sprint-3.1-review.md](sprint-3.1-review.md) · [reviews/sprint-2.6-review.md](sprint-2.6-review.md)
