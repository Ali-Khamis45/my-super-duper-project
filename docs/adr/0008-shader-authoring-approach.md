# ADR-0008 — `onBeforeCompile` for physically-lit surfaces, drei `shaderMaterial()` for unlit effects; shader source as TS template strings

**Status**: Accepted

## Context

Two different needs both get called "shaders" on the roadmap: custom vertex/fragment behavior on surfaces that must still look physically lit and consistent with the HDRI-lit scene (coffee, foam), and inherently unlit/effect-driven visuals with no physical-lighting requirement (steam, glow, particles). Treating both the same way — either reimplementing PBR lighting by hand for everything, or wrapping simple unlit effects in more machinery than they need — would be wrong for one of the two cases. Separately, shader *source* needs a home: the conventional `.glsl`-file-import pattern requires a bundler loader plugin, and Turbopack (this project's bundler, Next.js 16's default) doesn't have the same mature loader-plugin ecosystem Vite/webpack-based Three.js projects typically rely on.

## Decision

Two authoring paths, chosen per surface (see [13_SHADER_ARCHITECTURE.md](../13_SHADER_ARCHITECTURE.md)): `material.onBeforeCompile` extending an existing `MeshPhysicalMaterial` for anything that must stay physically lit; drei's `shaderMaterial()` + `extend()` for anything unlit/effect-driven. Shader source is written as plain TypeScript template strings, not separate `.glsl` files — shared snippets (noise, math utilities) live in `engine/shaders/common/` as exported string constants, composed via template-literal interpolation, mirroring how Three.js's own built-in `ShaderChunk` system composes shader code internally.

## Consequences

Gains: physically-lit surfaces (coffee, foam) get Three's correct, battle-tested PBR lighting for free instead of a hand-rolled reimplementation; unlit effects (steam) stay simple, dedicated, and don't carry unused lighting-model complexity; zero new build tooling or bundler-plugin risk, fully portable regardless of Turbopack's loader ecosystem maturity. Costs: template-string GLSL loses IDE syntax highlighting/tooling a dedicated `.glsl` file would have (a real, accepted developer-experience trade-off) and requires manual, disciplined string composition instead of a build-time `#include` — mitigated by keeping `common/` small and well-named rather than building a large shared-chunk library. Revisit if Turbopack ships a mature GLSL-loader plugin and the manual string composition becomes a real friction point, not before.
