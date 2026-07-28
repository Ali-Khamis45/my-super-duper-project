# 02 — Design System

Live reference: `/design-system` (`src/design-system/DesignSystemPreview.tsx`). This doc explains the *why*; the route shows the *what*, always up to date since it renders the real tokens/components.

## Tokens (`src/styles/tokens.css`, mirrored in `src/design-system/tokens/*.ts`)

Three OKLCH ramps (50–900 except accent):

- **espresso** — warm near-black browns, hue ~28–40. Ink/dark-surface role.
- **cream** — warm off-whites, hue ~72–85. Light-surface role.
- **brand-accent** (300–700) — copper/gold, hue ~45–60, higher chroma. Reserved for CTAs, focus rings, and glow — used sparingly, never as a base surface color. `-600` is darkened (L 0.58 -> 0.54) from its first draft value: at 0.58 it measured 4.40:1 against `cream-50`, just under WCAG's 4.5:1 text minimum, verified with the real OKLCH->sRGB conversion (`oklchToSrgb`) rather than eyeballed. `--ring` (the focus-ring color) intentionally points at `-600`, not the more vibrant `-500` used decoratively elsewhere (nav icon, demo swatches) — `-500` only clears 2.93:1 against `cream-50`, under the 3:1 WCAG 1.4.11 floor for UI-component contrast.

Semantic aliases (`--background`, `--foreground`, `--card`, `--primary`, etc.) are the shadcn contract, remapped per theme from the ramps above rather than holding independent values — this is what makes every shadcn-generated component theme-correct for free.

Dark mode is `[data-theme="dark"]`-scoped (a `@custom-variant dark`, not the shadcn-CLI-default `.dark` class) so it matches [ADR-0003](adr/0003-theme-system.md) and `next-themes`' `attribute="data-theme"` config — chosen so `engine/theme/` can key off the same attribute for the 3D scene without a second theme-detection mechanism.

Radius scale: `sm/md/lg/xl/2xl` derived from one `--radius` base (shadcn convention) plus `--radius-full` for pills. Spacing adds two semantic values (`--spacing-section`, `--spacing-section-sm`) on top of Tailwind's default scale — section-level rhythm gets a name instead of a repeated arbitrary value. Elevation defines glass shadows (`sm/md/lg`) and two accent glow shadows, used by `GlassSurface`/`GlowCard` and, later, hover states across the site.

The **TS mirror** (`design-system/tokens/*.ts`) exists only for values something in JS actually needs to read — CSS custom properties aren't readable from Three.js materials or Framer Motion/GSAP configs. That's `colors.ts` (consumed by `engine/theme/ColorSchemes.ts` for `THREE.Color`) and `motion.ts` (consumed by `engine/motion/easings.ts`/`durations.ts`). Spacing, typography, and elevation are **not** mirrored — nothing in JS needs their raw values, only Tailwind classes/CSS var references, so a mirror would be unused dead code. If a real JS consumer ever needs one, mirror it then, not before — see [06_CODING_STANDARDS.md](06_CODING_STANDARDS.md)'s "no half-finished code" rule.

## Typography

Fraunces (variable, optical-size + soft/wonk axes enabled) for display/headline text via `--font-display`; Geist Sans for UI/body via `--font-sans`; Geist Mono for anything tabular/code via `--font-mono`. `--text-hero` (5.5rem) and `--text-display` (3.25rem) are the two oversized display sizes the hero/section headers use, each paired with an explicit line-height token — Tailwind's default scale covers everything smaller.

## Theming

`design-system/theme/ThemeProvider.tsx` wraps `next-themes` (`attribute="data-theme"`, `defaultTheme="system"`, `enableSystem`) — handles FOUC-safe theme application and system-preference detection without hand-rolled logic. `ThemeToggle.tsx` reads/writes it; it renders a stable, inert placeholder until the client hydrates (via `useIsClient`, a `useSyncExternalStore`-based hook — not an effect+`setState`, which the React Compiler-aware lint rules correctly flag as cascading-render-prone) so SSR output never guesses the wrong theme.

## Base components

Via `shadcn` (built on **Base UI**, not Radix — shadcn's current default primitive library; functionally equivalent focus-trap/keyboard/ARIA guarantees): `button, input, textarea, card, separator, dialog, sheet, skeleton, tooltip, dropdown-menu, avatar`. `TooltipProvider` wraps the app in `app/providers.tsx` per Base UI's requirement.

Two custom primitives in `design-system/primitives/`:

- **`GlassSurface`** — the frosted/blur panel (`backdrop-blur-xl`, translucent background, glass shadow token) that the Navbar sits on.
- **`GlowCard`** — a `Card` with the accent glow shadow and a pointer-tilt on hover, via `engine/motion/gestures`'s `useTilt` hook.

## Related

[01_ARCHITECTURE.md](01_ARCHITECTURE.md) · [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md) · [05_UI_GUIDELINES.md](05_UI_GUIDELINES.md) · [adr/0003-theme-system.md](adr/0003-theme-system.md)
