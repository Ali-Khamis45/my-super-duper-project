# 05 — UI Guidelines

## Glass & elevation

`GlassSurface` (frosted, translucent, `shadow-glass-*`) is reserved for chrome that floats over content — the Navbar today, future overlays later. It is not a general card background; use `Card`/`GlowCard` for content containers. Don't stack glass-on-glass — one translucent layer at a time reads as intentional, two reads as murky.

`GlowCard`'s accent glow is a hover-state signal, not decoration — reserve it for genuinely interactive cards. A static content card should stay a plain `Card`.

## Fixed navigation

The Navbar is `position: fixed`, transparent-to-glass over content beneath it. Full-bleed hero sections (the home page) intentionally render behind it — that's the premium "chrome floats over content" look. Any non-hero page (the coming-soon routes, and future built-out pages) must add top padding (`pt-28` — matches the Navbar's rendered height + margin) so content doesn't start hidden under it. `ComingSoonPage` already does this; follow its pattern.

## Motion usage

Use `engine/motion/presets` (`fadeIn`, `fadeUp`, `pop`, `stagger`) for entrances/feedback rather than inventing a transition inline — see [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md). Automatic motion (page-load entrances, hide-on-scroll, idle float, tilt) is gated on `usePrefersReducedMotion`; this project's convention is to disable the effect outright under reduced motion rather than attempt a "lesser" version — a half-motion compromise is often more disorienting than none. Direct-manipulation gestures (drag-rotate, magnetic hover while the pointer is actually over the element) are never gated.

## Navigation content

Only link to routes that exist. This milestone that means: `/` (the hero), `/design-system` (internal reference, not linked from the Navbar), and three honest "coming soon" placeholders (`/menu`, `/customize`, `/story`) that state plainly which milestone builds them — see `ComingSoonPage`. Never ship a Navbar link that 404s; add the placeholder route first.

## Typography rhythm

`font-display` (Fraunces) is for section-level headings and hero copy only — body copy, nav links, buttons, and form controls stay on `font-sans` (Geist). Mixing them at the same size/weight is what makes the pairing read as intentional rather than accidental.

## Related

[02_DESIGN_SYSTEM.md](02_DESIGN_SYSTEM.md) · [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md)
