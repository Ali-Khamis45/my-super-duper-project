# ADR-0001 — Next.js App Router as the application framework

**Status**: Accepted

## Context

The project needs server-rendered marketing-grade pages (SEO, fast first paint, metadata/OpenGraph) alongside heavy client-only interactivity (R3F 3D scenes, drag interactions, live customization state in later milestones). It also needs streaming/Suspense for a hero that shouldn't block on the 3D bundle loading.

Alternatives considered: Pages Router (legacy, no first-class RSC/streaming), a pure SPA (Vite + React Router — loses SSR/SEO benefits the product-vision explicitly cares about), a separate marketing-site/app split (adds deployment and shared-design-system complexity not justified at this stage).

## Decision

Use Next.js App Router with React Server Components as the default, dropping to Client Components only where interactivity requires it (notably the entire R3F subtree, dynamically imported with `ssr: false`).

## Consequences

Gains: SEO/metadata handled naturally, streaming lets the hero shell paint before the 3D bundle is ready, RSC keeps the 3D/animation libraries out of the server bundle entirely. Costs: contributors must be deliberate about the client/server boundary (see [01_ARCHITECTURE.md](../01_ARCHITECTURE.md)'s SSR boundary section) — an accidentally-client-ified layout would bloat every route's JS.
