# Milestone 1 — Final Report

**Date**: 2026-07-28
**Status**: Stabilization gate complete. Milestone 2 has **not** started — this report is the gate, not a green light issued by itself.

## Architecture summary

Four-layer split, dependency direction verified clean (not just designed clean — checked file-by-file with no violations found):

```
engine/  (lowest layer — no dependency on design-system components or features)
  ↓ (design-system depends on engine machinery + shadcn primitives)
design-system/
  ↓
components/  (cross-cutting chrome; shadcn ui/ primitives)
  ↓
features/hero-cup/  (depends on everything below; nothing depends on it)
```

One convention — a name×implementation registry with a typed-but-partially-populated union — used identically in three places (cup parts, camera presets, post-processing effects), so understanding one means understanding all three. Full rationale in [01_ARCHITECTURE.md](../01_ARCHITECTURE.md) and the five ADRs.

## Folder structure (as shipped)

```
coffeshop/
├── docs/                        25 markdown files: governance (00-11), 5 ADRs, 3 review docs,
│                                 4 strategy docs, state-machine, asset-pipeline
├── public/{models,textures,hdri}/   empty — no real assets yet (fully procedural)
├── src/
│   ├── app/                     routes: /, /design-system, /menu, /customize, /story
│   ├── components/{layout/,ui/} navbar, coming-soon template, shadcn primitives
│   ├── design-system/           tokens (colors, motion), primitives (GlassSurface, GlowCard), theme
│   ├── engine/                  motion, theme bridge, graphics, camera, effects, analytics, devpanel
│   ├── features/hero-cup/       components, parts (8), registry, geometry, hooks
│   ├── hooks/, lib/, stores/, styles/
```

85 source files, ~2,624 lines of first-party TypeScript/TSX (shadcn-generated `components/ui/` excluded from that count as vendored code).

## Implemented features

- **Hero**: full-viewport, live procedural 3D coffee cup (cup, lid, sleeve, coffee, foam, steam, logo, contact shadow — all 8 parts from the spec), PBR materials, HDRI environment, real-time shadows, bloom, theme-reactive lighting.
- **Interaction**: drag-to-rotate with inertia (mouse and touch, distinguished), idle auto-spin that pauses on hover, **keyboard rotation** (Left/Right arrow keys — added this stabilization pass), mouse-parallax camera drift.
- **Navigation**: glass, sticky, hide-on-scroll Navbar; focus-trapped mobile sheet menu; three honest "coming soon" placeholder routes (no dead links).
- **Design system**: OKLCH token system (espresso/cream/copper), Fraunces+Geist typography, light/dark theming (DOM and 3D scene both react), a live `/design-system` reference route.
- **Dev tooling**: FPS/render-stats overlay, toggled with the backtick key in development (fixed this pass — was previously unreachable).
- **Governance**: 12 numbered docs, 5 ADRs, 3 milestone review documents, a 24-phase roadmap.

## Performance metrics (measured, not estimated)

| Metric | Value | Method |
|---|---|---|
| Initial JS, `/` (gzipped) | ~303 KB | Computed directly from `.next/static/chunks` build output |
| Largest single chunk | 1.2 MB (three.js/`@react-three`) | Confirmed **absent** from the initial page's script tags — loads only when the dynamic import resolves |
| Production build | Clean, no errors/warnings | `next build`, run repeatedly through this session |
| React Query Devtools in production bundle | Absent | Confirmed via chunk grep |
| Stray `console.*` calls | Zero (outside the one gated analytics sink) | Full-codebase grep |

**Not measured** (environment limitation, disclosed rather than guessed): real-device FPS under sustained interaction, Lighthouse score, Core Web Vitals from a deployed URL. The dev panel (now functional) is the mechanism for the first of these once a real browser is available.

## Accessibility results

- Full `eslint-plugin-jsx-a11y` **recommended** ruleset wired in (not just `eslint-config-next`'s 6-rule subset) — zero violations.
- **Two real WCAG failures found via computed contrast math and fixed**: label text at 4.40:1 (below the 4.5:1 text minimum) and the light-theme focus ring at 2.93:1 (below the 3:1 UI-component minimum). Both corrected; both re-verified computationally, not eyeballed.
- **One real functional gap found and closed**: the 3D cup had no keyboard interaction path at all. Now fully keyboard-operable (focusable, labeled, Left/Right rotation) alongside pointer/touch.
- Reduced-motion policy verified consistent across every automatic animation in the app (one inconsistency — the Navbar — found and fixed this pass).
- Semantic landmarks, SkipLink, `aria-hidden` on all decorative icons, Base UI primitives for focus-trap/keyboard-correct Sheet/Dialog/Tooltip.
- **Not verified** (environment limitation): live screen-reader testing, real keyboard-only user walkthrough beyond code-level tracing.

## Bundle analysis

See Performance metrics above for the headline numbers. No egregious single-dependency bloat was found; the two largest non-three.js chunks (~140KB each, uncompressed) are Next.js/React framework runtime, not app code or an oversized dependency — not something reducible without ejecting the framework.

## Remaining risks

1. **Headless-capture flakiness in this session's tooling.** Screenshot capture via headless Chrome proved intermittently unreliable late in this session (confirmed via DOM-level inspection to be a capture-timing artifact — canvas sizing and console state were both correct on the failed-screenshot runs — not an app defect), but it means final visual sign-off rests on the successful captures obtained earlier, not on every single check. Recommend one real-browser pass before or during Milestone 2's kickoff.
2. **Dark-theme 3D rendering** was not conclusively screenshotted in this environment (see the first CDR review's disclosure). The code path is identical to the proven-working light-theme path; this is a verification gap, not a known defect.
3. **Sensory payoff visibility.** Coffee/foam/steam — central to the hero copy's promise — aren't visible from the default camera angle without user interaction. Not a defect, but a compositional opportunity flagged in two consecutive reviews now.

## Known limitations (by design, documented)

- Fully procedural geometry — no real GLB assets yet (the registry pattern exists specifically so this is a one-entry swap later, not a rewrite).
- Steam is billboarded planes, not a shader/particle simulation (Milestone 2).
- No liquid physics (Milestone 3), no customizer state (Milestone 4), no commerce/audio (Milestones 5/8 — no scaffolding exists for either, deliberately, per the "no half-finished code" standard).
- No automated test suite yet — a documented policy decision ([11_TESTING_QA.md](../11_TESTING_QA.md)), reconsidered once there's real interactive state logic (customizer) worth unit-testing.

## Future hooks (already in place, unexercised)

- `CameraPresetName` union includes `product`/`checkout`/`ai`/`ingredient`/`exploded` — typed now, registered when their milestones arrive.
- `EffectName` registry ready for `dof`/`vignette`/`chromaticAberration`/`ssr`/`noise` — one `case` each, no consumer changes.
- `PartImplementation = "procedural" | "model"` on every cup part — a real GLB drops in as one registry entry (worked example in [3d-asset-pipeline.md](../3d-asset-pipeline.md)).
- `CupPartProps.colorway`/`materialOverrides` typed and threaded through every part, unused until Milestone 4's customizer gives them a real writer.

## Ready for Milestone 2?

**Yes, conditionally.** The stabilization gate found and fixed real defects across every audited dimension — five ship-blocking 3D rendering bugs in the original build, two WCAG contrast failures, one completely non-functional feature (dev panel), a reduced-motion inconsistency, and seven instances of dead code across two audit passes. None of that would have surfaced from `tsc`/`eslint`/`next build` alone; all of it came from actually reading every file and actually rendering the pages. The codebase that remains is lean (nothing survived two rounds of dead-code detection), the architecture holds under scrutiny (verified dependency direction, not just asserted), and accessibility is now genuinely rigorous rather than checkbox-complete.

The condition: items 1 and 2 under **Remaining risks** — a real-browser visual pass and dark-theme confirmation — should happen before or very early in Milestone 2, since they're the two things this environment couldn't conclusively close out. Neither blocks starting Milestone 2's work (steam shaders, day/night lighting); both should happen before Milestone 2 itself is declared done.

## Recommendation

Proceed to Milestone 2 (Steam & Lighting Depth) once you give the word — the gate is closed on this end. Do the real-browser confirmation pass as the first thing in that milestone's own verification step, rather than blocking on it now.
