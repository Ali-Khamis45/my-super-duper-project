# 06 — Coding Standards

## TypeScript

- `strict: true`, plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noUnusedLocals`, `noUnusedParameters`.
- No `any`. If a type is genuinely unknown at a boundary (e.g. a third-party callback payload), use `unknown` and narrow.
- No non-null assertions (`!`) as a substitute for a real null check, except where a library's own types are wrong and the alternative is worse (comment why, at the call site).
- Prefer `type` for unions/props shapes, `interface` for anything meant to be extended (the `CupPartProps` contract, future part implementations).

## SOLID, applied concretely here

- **Single responsibility**: a cup part component renders and animates itself; it does not know about the registry, and the registry does not know about geometry. `CupScene` composes; it does not implement.
- **Open/closed**: new cup parts, camera presets, and effects are added by registering a new entry, never by editing the code that consumes the registry.
- **Liskov substitution**: any `CupPartComponent` (procedural or, later, model-backed) must be interchangeable behind `CupPartProps` with no caller-side branching.
- **Interface segregation**: hooks expose the minimum surface a consumer needs (`useCupInteractionState` returns the current state + transition triggers, not the whole animation implementation).
- **Dependency inversion**: features depend on `engine/` contracts (camera preset names, effect names, motion tokens), never the reverse.

## No duplicated values

If a color, spacing value, easing curve, or duration appears as a literal outside `design-system/tokens/` or `engine/motion/`, it's a bug, not a stylistic choice. `engine/theme/ColorSchemes.ts` derives `THREE.Color`s from the existing token module — it does not redefine the palette.

## No half-finished code

- No folder, export, or file for a system that has no real consumer this milestone — see the "Future modules" section of [01_ARCHITECTURE.md](01_ARCHITECTURE.md). Document instead of stub.
- No commented-out code left in place "for later" — git history is the record of what existed before.
- No `TODO` without an owner and a milestone reference (`// TODO(milestone-4): ...`), and only where the gap is intentional per the docs, not a shortcut.

## Naming & file organization

- Components: `PascalCase.tsx`. Hooks: `useCamelCase.ts`. Non-component modules: `camelCase.ts`.
- One default export per component file, named the same as the file.
- Procedural cup parts are prefixed `Procedural*` to make the registry's `procedural | model` axis legible at the file-tree level.
- Feature folders (`features/<name>/`) always contain `components/`, `hooks/`, and a `README.md`; `registry/`, `geometry/`, `lib/` appear only when the feature actually needs them (hero-cup does; a simpler future feature might not).

## Accessibility & motion

- Every animated component has a reduced-motion behavior decided at build time, not bolted on: automatic/ambient animation (idle float, parallax, page-transition motion) stops or simplifies under `prefers-reduced-motion`; direct-manipulation input (drag-to-rotate) stays enabled, per WCAG's actual scope.
- No `outline: none` / focus-ring removal without a visible replacement.
- Interactive elements are real semantic elements (`button`, `a`, `nav`) with correct ARIA, not styled `div`s with click handlers.

## Related

[01_ARCHITECTURE.md](01_ARCHITECTURE.md) · [04_MOTION_ENGINE.md](04_MOTION_ENGINE.md) · [11_TESTING_QA.md](11_TESTING_QA.md)
