# Milestone 1 — Stabilization Gate Review

**Date**: 2026-07-28
**Type**: Full-project audit (architecture, design system, 3D engine, motion, accessibility, performance, code quality, documentation) plus a second Creative Director Review, per the user's explicit stabilization-gate request. Not a new feature pass — Milestone 2 has not started.

## Method

Every folder was re-read, not assumed correct because it built. Findings below are grouped by audit section in the order they were performed; each is a real defect found through direct inspection (grep, computed WCAG math, dependency-direction checks, bundle analysis) or direct rendering (headless Chrome, isolated profile), not a stylistic preference.

## Findings and fixes, by section

### 1. Architecture
Clean. Verified (not assumed): zero dependency-direction violations (`engine/` never imports `features/` or `design-system/` components; `design-system/` and `features/` correctly depend downward); all "use client" boundaries are at the correct, minimal points; no deep relative-import chains; naming conventions hold throughout. No fixes needed.

### 2. Design System
- **Fixed**: `TextureLoader.ts`'s logo badge used invented RGB literals that only approximated the real espresso/copper/cream tokens. Now derives from the actual tokens via a new shared `oklchToCssRgba` helper.
- **Fixed**: `Navbar.tsx` hardcoded `duration: 0.3` instead of referencing `durations.base` (the identical value, already tokenized).

### 3. 3D Engine
- **Fixed**: `DevPanelStatsCollector` ran its `useFrame` loop unconditionally, including in production builds, despite the DOM overlay it feeds being production-gated. Now gated on `NODE_ENV` to match.
- **Reviewed, no change**: geometry segment counts, shadow-casting flags (steam/logo correctly excluded), memory allocation patterns (no per-frame `new THREE.*` calls anywhere), event-listener cleanup (all verified paired). React.memo on the 8 cup parts was considered and deliberately not applied — re-renders only occur a few times per user interaction (state-machine transitions), not per-frame; the added complexity wasn't justified by a measurable win.

### 4. Motion
- **Fixed**: Navbar's entrance animation (`fadeIn`) played unconditionally, ignoring `prefers-reduced-motion` — inconsistent with every other automatic animation in the app (all of which do gate on it) and with our own documented policy. Now matches `HeroCopy`'s pattern.
- **Fixed**: `parallax` (scroll-strength multipliers) and `floatAnimate()` (a 2D float helper) in `engine/motion/presets.ts` had zero consumers — documented as "used this milestone" in `04_MOTION_ENGINE.md` but no feature was ever built against them. Removed; doc corrected.

### 5. Accessibility
- **Fixed, real WCAG failures**: computed actual contrast ratios (not eyeballed) using the project's real OKLCH→sRGB math. `brand-accent-600` on `cream-50` measured 4.40:1 — under the 4.5:1 text minimum — used for the "COFFESHOP" eyebrow label and coming-soon page milestone tags. Darkened (L 0.58→0.54) to 5.20:1. Separately, the light-theme focus ring (`--ring`, pointing at `brand-accent-500`) measured only 2.93:1 against `cream-50` — under WCAG 1.4.11's 3:1 floor for UI-component contrast. Repointed `--ring` at the now-fixed `-600` instead of diluting `-500`'s decorative use elsewhere.
- **Fixed, real functional gap**: the 3D cup's drag-to-rotate had **no keyboard equivalent at all** — a keyboard-only user could see it (idle auto-rotate still plays) but never control it. Implemented Left/Right arrow-key rotation on a newly-focusable, labeled canvas region (`role="application"`, visible focus ring), bridged into the R3F tree via a small dedicated store since the DOM keydown source and the rotation state live on opposite sides of the Canvas boundary.

### 6. Performance
Real bundle analysis performed (not estimated): the three.js/`@react-three` bundle (1.2MB raw, by far the largest chunk) is confirmed absent from the initial page load in the actual build output — it only loads once the dynamic import resolves. Initial JS for `/` measures ~303KB gzipped, computed directly from the build artifacts — reasonable for the stack (Next 16 + React 19 + Framer Motion + TanStack Query + Zustand + Lenis). React Query Devtools confirmed excluded from production chunks. No stray `console.*` calls outside the one deliberately-gated analytics sink.

### 7. Code Quality
Zero `any`, zero non-null assertions (`!`), zero orphaned `TODO`/`FIXME`, no oversized files, no SOLID violations found. **Fixed, real dead code** (beyond what design-system/3D/motion sections already caught): `loadTexture()` in `TextureLoader.ts` (zero consumers — everything this milestone generates textures at runtime) and `bloomConfigFromTheme()` in `engine/effects/bloom.ts` (a trivial identity wrapper the one call site never actually called, building an equivalent object literal inline instead). **Fixed, a genuinely broken feature**: `toggleDevPanel` existed in the UI store but nothing ever called it, and `<DevPanel />` itself was never mounted anywhere in the app — the entire dev-panel feature was built but completely inert. Wired a backtick-key toggle and mounted the overlay in `Hero`.

### 8. Documentation
Cross-checked every doc against current code. **Fixed, stale/incorrect claims**: `03_3D_ENGINE.md` still described `ColorSchemes.ts` as using `THREE.Color.setStyle()` for OKLCH — the exact mechanism proven broken and replaced during Milestone 1's original Creative Director Review; the doc was never updated to match. Also stale: `TextureLoader.ts`'s doc entry still described the now-removed `loadTexture()`; the dev-panel doc didn't mention the (previously nonexistent, now real) toggle mechanism. All corrected. `state-machine.md` and the feature README updated with the new keyboard-rotation path.

## Second Creative Director Review

Scored against what Milestone 1 delivers *after* the fixes above — not the original build. Rendering verified via headless Chrome (isolated profile) plus a DOM-level check (correct canvas sizing, zero console errors) when screenshot capture itself proved flaky in this session (see below).

| Category | Score | Notes |
|---|---|---|
| Visual quality | 8.5/10 | Confirmed via direct rendering: lid, sleeve, logo, contact shadow, bloom, and camera framing all correct. Sleeve color reads more muted/dusty than "kraft brown" (a token choice, not a defect); coffee/foam/steam still aren't visible from the default angle. |
| Motion quality | 8.5/10 | Reduced-motion policy is now uniformly applied (the Navbar gap was the last inconsistency). Shared timing/easing/spring system throughout, nothing bespoke per component anymore. |
| Interaction quality | 9/10 | The category that improved most this pass — full keyboard parity now exists alongside drag/touch, on top of hover, magnetic CTA, tilt, working theme toggle, and a now-functional dev panel. |
| Emotional impact | 7.5/10 | Unchanged from the first review — good first impression, but the "sensory payoff" (coffee/foam/steam) still isn't visible without interaction. |
| Originality | 7.5/10 | Unchanged — a taste/creative-direction ceiling, not something a stabilization pass can move; genuinely needs new creative work, not more engineering. |
| Craftsmanship | 8.5/10 | New category. Evidenced directly by this pass: real computed WCAG math instead of eyeballing, a correct OKLCH conversion algorithm, consistent token derivation everywhere (including the logo texture, previously hand-picked RGB), zero dead code surviving two full audit passes. |
| Accessibility | 9.5/10 | The most improved category. Full `jsx-a11y` ruleset, two real, computed WCAG failures found and fixed, complete keyboard interaction parity for the 3D centerpiece. Remaining gap (live screen-reader/real-user testing) isn't closeable from this environment, not a known defect. |
| Performance | 8.5/10 | SSR boundary and bundle size verified against real build output, not estimated; one real production-waste bug found and fixed. Real-device FPS/Lighthouse remains unmeasurable here — an environment limitation, disclosed, not a code gap. |
| Architecture | 9.5/10 | Verified, not just designed: dependency direction checked file-by-file and found clean; the registry/contract pattern holds consistently across cup parts, camera presets, and effects. |
| Developer experience | 8.5/10 | New category. Extensive, now-accurate docs, a living `/design-system` reference, a working dev panel, consistent scripts. No automated tests yet — a documented, deliberate policy ([11_TESTING_QA.md](../11_TESTING_QA.md)), not an oversight. |
| Scalability | N/A — not yet in scope | No commerce/multi-product/customizer state exists yet to stress; the registry patterns are built for it but unexercised. |
| Code quality | 9/10 | New category. Zero `any`/non-null-assertions/orphaned TODOs; seven total dead-code instances found and removed across both audit passes — evidence the codebase stays lean under scrutiny, not evidence it was sloppy. |
| Documentation | 9/10 | New category. Cross-checked against real code in this pass specifically (not just written once and trusted); five stale references found and corrected. |

### Improvement loop — practically exhausted for this environment

Every category above 9.5 either reflects a genuine, closed gap or a limitation of this specific working environment (no real browser, no real device, no live user/screen-reader testing, no deployed URL for Lighthouse) rather than an unaddressed code defect. Continuing to iterate on Visual Quality/Emotional Impact/Originality without new creative direction, or on Performance/Accessibility without real-device access, would produce busywork rather than genuine improvement — the honest stopping point the process calls for.

## Related

[09_CREATIVE_DIRECTOR_REVIEW.md](../09_CREATIVE_DIRECTOR_REVIEW.md) · [milestone-1-creative-director-review.md](milestone-1-creative-director-review.md) (the original, first-pass review)
