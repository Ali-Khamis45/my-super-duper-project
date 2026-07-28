# 10 — ADR Guidelines

## When an ADR is required

Any decision that would be expensive to reverse, or that future contributors would reasonably ask "why did we do it this way?" about: framework/router choice, a new cross-cutting `engine/` system, state-management approach, a rendering-pipeline strategy, anything that trades simplicity for a specific capability. Not required for reversible, local implementation details (a component's internal prop shape, which shadcn primitive to use for a given control).

## Template

```markdown
# ADR-000X — <Decision title>

**Status**: Accepted | Superseded by ADR-000Y | Deprecated

## Context
What problem/forces led to this decision. What alternatives existed.

## Decision
What we chose, stated plainly in one or two sentences.

## Consequences
What this makes easier, what it makes harder, what it forecloses. Include the honest trade-offs, not just the upside.
```

## Numbering & location

Sequential, zero-padded to 4 digits, never reused even if an ADR is later superseded: `docs/adr/000X-kebab-case-title.md`. A superseding ADR links back to the one it replaces; the old file is not deleted.

## Milestone 1 ADRs

[0001-nextjs-app-router.md](adr/0001-nextjs-app-router.md) · [0002-r3f-architecture.md](adr/0002-r3f-architecture.md) · [0003-theme-system.md](adr/0003-theme-system.md) · [0004-motion-engine.md](adr/0004-motion-engine.md) · [0005-state-management.md](adr/0005-state-management.md)

## Milestone 2 ADRs

Design-phase ADRs, written before implementation — see [milestone-2-architecture-rfc.md](milestone-2-architecture-rfc.md).

[0006-scene-management-strategy.md](adr/0006-scene-management-strategy.md) · [0007-animation-orchestration.md](adr/0007-animation-orchestration.md) · [0008-shader-authoring-approach.md](adr/0008-shader-authoring-approach.md) · [0009-asset-compression-pipeline.md](adr/0009-asset-compression-pipeline.md)
