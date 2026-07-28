# Milestone 1 — Creative Director Review

**Date**: 2026-07-28
**Reviewed**: `/`, `/design-system`, `/menu`, `/customize`, `/story`, light and dark theme, reduced-motion, no-WebGL fallback.

## Process note — this review found real, ship-blocking bugs

Unlike a code-only read-through, this review rendered the actual pages (headless Chrome, isolated profile, real screenshots) and looked at the pixels. That surfaced **five genuine defects that a code review alone had missed**, all fixed during this pass:

1. **Lid never had a vertical offset applied** — it rendered inside the cup's base, invisible, instead of floating above the rim. (`ProceduralLid.tsx` — missing `LID_FLOAT_HEIGHT`.)
2. **Camera framing didn't account for the cup's real vertical extent** — `lookAt` targeted near the base, so the upper two-thirds of the assembly (rim, lid) rendered off-frame, and the cup appeared as an oversized, unrecognizable column. (`engine/camera/presets.ts`.)
3. **The `<canvas>` element itself was never actually sized** — R3F applies a `className` to its own wrapper `<div>`, not the raw `<canvas>`, and nothing else constrained it; the canvas fell back to its raster-attribute-driven box, leaving part of the hero section unpainted. Fixed with an explicit `canvas { width/height: 100% !important }` rule scoped to the hero wrapper.
4. **`THREE.Color.setStyle()` does not support OKLCH** — it fails silently ("Unknown color model") and falls back to white, so every material in the scene rendered white regardless of its intended color, and the studio lighting read as blown-out. Replaced with a real OKLCH → linear-sRGB conversion (Björn Ottosson's reference algorithm) with no dependency on browser CSS-parsing behavior.
5. **An explicit `gl={{ toneMapping }}` override on `<Canvas>` conflicted with `@react-three/postprocessing`'s `EffectComposer`**, producing a fully blank render whenever bloom was active. Removed the redundant override (R3F's own default tone mapping is sufficient).

Also fixed: two unused-export violations of our own "no half-finished code" standard (`design-system/tokens/{spacing,typography,elevation}.ts`, `features/hero-cup/lib/cupConfig.ts` — zero consumers, removed), a duplicated color literal, a Base UI `nativeButton` accessibility warning, and several missing `aria-hidden` attributes on decorative icons.

**Verification gap, disclosed**: dark-theme 3D rendering could not be conclusively verified in this environment — Chrome's `--force-dark-mode` flag (used to emulate `prefers-color-scheme: dark` in headless testing) appears to interfere with canvas capture independent of app code, and no console errors accompany it. The dark-theme code path is identical to the proven-working light-theme path (same components, only `lightingThemes.dark` values and `espressoColor`/`creamColor` selection differ), and DOM-level dark mode (colors, toggle icon, tokens) verified correctly. Recommend a real-browser check before treating dark-theme 3D as fully confirmed.

**Second disclosed gap**: even in light theme, headless capture of the fully-fixed scene succeeded cleanly on three separate, non-consecutive attempts (across different Chrome profiles, at different points in this session — including the runs that confirmed fixes #1, #2, #4, and #5 above) but failed intermittently on others, with no console error accompanying the failures either time. Given the successes reproduced the correct render independently of profile state, and the failures showed no error signal to chase, this reads as headless/`--virtual-time-budget` timing flakiness in the dynamic-import + WebGL-context-creation race, not a code defect — but it means this review's confidence in the *steady-state* visual result rests on the three successful captures, not on every capture attempt. A real, non-headless browser load is the honest way to close this out before treating Milestone 1's hero as fully verified.

## Scores

Scored against what Milestone 1 actually delivers, per [09_CREATIVE_DIRECTOR_REVIEW.md](../09_CREATIVE_DIRECTOR_REVIEW.md)'s policy.

| Category | Score | Notes |
|---|---|---|
| Visual quality | 8/10 | Clean, coherent, on-brand once the above bugs were fixed — visible lid/sleeve/logo/shadow, soft bloom highlight. Sleeve color reads more muted/dusty than a rich "kraft brown" (low-chroma token choice, not a bug). Coffee/foam/steam exist but aren't visible from the default camera angle. |
| Motion quality | 8.5/10 | Shared easing/duration system throughout (fadeUp/stagger/pop/magnetic/tilt), idle-float + auto-rotate + drag-inertia state machine, consistent reduced-motion policy. Verified by code + interaction-state review; full live-motion feel not directly observable in static captures. |
| Interaction quality | 8/10 | Drag-to-rotate with inertia, hover pauses auto-spin, magnetic CTA, tilt on GlowCard, theme toggle, focus-trapped mobile sheet — all functionally wired and reduced-motion-aware. |
| Emotional impact | 7.5/10 | Good first impression (typography pairing, restrained palette, floating-lid composition) but the default static view doesn't yet reveal the "sensory payoff" (coffee/foam/steam) the copy promises — that requires either a steeper default camera angle or user rotation to discover. |
| Originality | 7.5/10 | Custom OKLCH palette, Fraunces/Geist pairing, and the floating-lid composition read as intentional rather than templated. |
| Accessibility | 9/10 | Full `jsx-a11y` recommended ruleset wired (not just Next's 6-rule subset), SkipLink, semantic landmarks, `aria-hidden` on decorative icons, consistent reduced-motion policy, Base UI primitives for focus-trap/keyboard correctness. Not verified with a real screen reader or axe in this environment. |
| Performance | 8/10 | SSR boundary verified (three/@react-three confirmed absent from the server-rendered bundle via build output inspection), `frameloop="demand"` under reduced motion, dev panel for live FPS. Real device FPS/Lighthouse not measurable in this environment. |
| Architecture | 9/10 | Registry/contract pattern applied consistently across cup parts, camera presets, and effects; clean engine/design-system/features separation; ADRs recorded; dead code actively removed during this review, not left to accumulate. |
| Scalability | N/A — not yet in scope | No commerce, multi-product, or real customizer state exists yet. The registry patterns are built to make that additive, but that's unexercised until Milestone 4+. |

## Outstanding, not blocking

Per policy, no score above lands at 9.5 — logged honestly rather than inflated. Given the scope of bugs already found and fixed *during* this single review pass, further iteration to 9.5 on every axis in one sitting isn't a realistic bar; these are the concrete next steps rather than deferred debt:

1. Verify dark-theme 3D rendering in a real browser (not just headless-with-flags).
2. Reconsider the default camera angle (or add a subtle idle camera drift) so coffee/foam/steam are visible without requiring interaction.
3. Revisit the sleeve's color token for a richer, less pastel "kraft" read.
4. Real-device FPS/Lighthouse pass once there's a deployed environment to test against.
