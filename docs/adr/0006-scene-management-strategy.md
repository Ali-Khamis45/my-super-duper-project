# ADR-0006 — Per-route Canvas instances, no global Scene Manager

**Status**: Accepted

## Context

The full roadmap needs several distinct 3D contexts: the Hero, a Customizer, Checkout, an AI Barista, and Scroll Storytelling. A "Scene Manager" that mounts/swaps scenes within one persistent, app-global `<Canvas>` is the conventional answer in single-page 3D applications (avoids WebGL context recreation cost, enables cross-scene morph transitions). The alternative is what Milestone 1 already does: each feature owns its own `<Canvas>` behind its own `ssr:false` boundary, mounted and unmounted with its route.

## Decision

No global Scene Manager. Every future 3D route follows the exact pattern `hero-cup` already established — its own Canvas, its own `ssr:false` boundary, its own scene-composition root. Scroll Storytelling, which needs continuous camera movement through *one* scene, is served by the Camera Manager's path-interpolation support (see [03_3D_ENGINE.md](../03_3D_ENGINE.md)), not by scene-switching — it's one scene, one Canvas, a moving camera, which was never in question.

## Consequences

Gains: each route stays independently code-split (Customizer's assets don't load until a user visits it), no new cross-route state-management surface, zero risk to Milestone 1's already-proven, already-shipped pattern. Costs: no cross-route morph transitions (e.g., the hero cup visually "becoming" the checkout view) — accepted because nothing on the actual roadmap ([08_MILESTONES.md](../08_MILESTONES.md)) asks for that; the sitemap ([strategy/sitemap.md](../strategy/sitemap.md)) describes Customizer/Checkout/AI-Barista as genuinely separate pages, not states of one continuous scene. WebGL context recreation cost on navigation is real but small relative to a full page navigation's own cost, and matches how the rest of the app already behaves (a Next.js route change).
