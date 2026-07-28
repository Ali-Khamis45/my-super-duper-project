# ADR-0003 — Token-driven theme, bridged into the 3D scene

**Status**: Accepted

## Context

The product needs light/dark (and eventually auto/day-night) theming across both DOM UI and the 3D hero scene. A DOM-only theme toggle (the common pattern) would leave the 3D scene's lighting/mood static and disconnected from the rest of the page when the theme changes — a flat, un-premium result given the hero is the centerpiece.

## Decision

Two-layer theming: (1) `design-system/theme/` — `next-themes`-based provider/toggle for DOM/Tailwind theming, class-based on `[data-theme]`, avoiding hand-rolled FOUC issues. (2) `engine/theme/` — `ThemeEngine.ts` reads the active theme for non-DOM consumers; `ColorSchemes.ts` derives `THREE.Color` values from the *same* design tokens (no second palette definition); `LightingThemes.ts` maps theme to HDRI preset/light intensity/bloom threshold, consumed by `CupScene`.

## Consequences

Gains: toggling theme changes the 3D scene's actual lighting mood, not just DOM colors — a real premium touch, and a single source of truth for color (design tokens) prevents the 3D and DOM palettes drifting apart. Costs: one more indirection layer (`engine/theme` deriving from `design-system/tokens`) versus just hardcoding scene lighting per theme inline in `CupScene` — justified because day/night lighting themes are already on the roadmap (Milestone 2) and will need this seam regardless.
