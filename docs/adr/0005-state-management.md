# ADR-0005 — Zustand for UI state, TanStack Query reserved for server state, no Redux

**Status**: Accepted

## Context

The app needs small amounts of ephemeral client UI state (nav open/closed, theme override, dev-panel toggle, and — from Milestone 4 — live customizer selections) and, eventually, real server/remote data (product catalog, orders, AI recommendations). Redux/Context-as-global-store were considered and rejected: Redux's boilerplate isn't justified by the actual state surface here, and prop-drilling-via-Context for frequently-changing UI state (e.g. drag position) causes unnecessary re-render fan-out.

## Decision

Zustand for client UI state (`stores/ui-store.ts`), kept small and flat. TanStack Query wired from Milestone 1 (provider + query client) for future server state, but not used to fetch anything until a feature has a real endpoint — no placeholder queries. Interaction state machines (e.g. `useCupInteractionState`) are local component/hook state, not global store state, since they're owned by one feature's UI tree.

## Consequences

Gains: minimal boilerplate, clear separation between "client UI truth" (Zustand) and "server truth" (React Query) so future data-fetching doesn't get tangled into the UI store. Costs: two state tools instead of one — accepted because they solve genuinely different problems (ephemeral UI vs. cached remote data) and conflating them tends to cause stale-cache/UI-state bugs later.
