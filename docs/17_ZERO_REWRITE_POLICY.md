# 17 — Zero Rewrite Policy

## The rule

A manager that ships in a given milestone is **frozen** at the end of that milestone: its public contract (exported types, function signatures, prop shapes) does not change in a way that breaks existing callers, ever, in any later milestone. Future features extend a frozen manager; they do not rewrite it.

This isn't new — it's the registry/contract pattern from [01_ARCHITECTURE.md](01_ARCHITECTURE.md) stated as an explicit constraint on all future work, not just the three places it's used today.

## The permitted extension mechanisms, in order of preference

Before touching an existing manager's file at all, the question is always **"can this be solved with...":**

1. **The registry** — add a union member + a registry entry. This is data growth, not logic change. The overwhelming majority of Milestones 3-10 features extend this way — see every scenario in [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)'s Extensibility Review.
2. **Composition** — combine existing managers through their existing public interfaces rather than adding a new capability inside one of them (e.g. AI Barista composing Camera Manager + Customizer store + EventBus, not adding "AI" concepts into Camera Manager itself).
3. **Adapters** — wrap an existing manager to present a different-shaped interface to a new consumer, without changing the manager underneath.
4. **Dependency injection** — pass a new capability into a manager as a parameter/callback rather than having the manager reach out and acquire it itself.
5. **Additive interface extension** — grow a return type or props shape with a new optional/additional field that existing consumers can ignore. This is the *only* mechanism that touches a manager's own contract, and it's constrained: **additive only, never removing or changing the meaning of an existing field.** [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)'s scenario 2 (`useCupInteractionState` gaining `velocityRef` for Coffee Physics) is the concrete example.

If none of the five apply, the architect must state in writing why extension is impossible before proposing a breaking change — and even then, a breaking change requires this document's approval process (below), not a unilateral edit.

## What counts as "rewriting" vs. "extending" — the distinction that actually matters

The literal text of a file changing is not the test. The test is: **does any existing caller's behavior change without that caller's code changing?**

- Adding `"sticker"` to `CupPartName` and a matching registry entry touches `cupPartRegistry.ts`, but `CupAssembly`'s render loop and `resolveCupPart`'s resolution algorithm are unchanged — every existing part still resolves exactly as before. This is **extension**, sanctioned, expected, encouraged.
- Changing `resolveCupPart`'s signature, or changing what `CupAssembly` does with a resolved part, would silently change behavior for every existing registered part. This is **rewrite**, forbidden without going through the exception process below.

This distinction is what makes "grow the registry freely" and "never rewrite a manager" simultaneously true instead of contradictory.

## What "public contract" means concretely

- Exported TypeScript types and their existing members (removing or changing the type of an existing member is breaking; adding an optional member is not)
- Exported function signatures (removing a parameter or changing its meaning is breaking; adding an optional trailing parameter is not)
- Component prop shapes (same rule)
- Emitted event names and payload shapes on the EventBus (adding a new event is not breaking; changing an existing event's payload shape is)
- Zustand store shapes exposed via a bridge store's `useValue`/`getValue`/`setValue` (the wrapped value's type is the contract)

## Exception process

If, after honestly working through the five mechanisms above, extension genuinely cannot solve a need, the architect documents *why* (which mechanism was tried, what it couldn't do) as part of that milestone's design phase — the same discipline already used for [milestone-2-architecture-rfc.md](milestone-2-architecture-rfc.md) and this freeze. Only after that written justification and explicit approval may a public contract change, and it ships as a new major version of that contract with the old shape either removed in the same change (if genuinely zero external callers exist) or bridged, never left ambiguous.

No contract change has been needed for any of the twelve scenarios stress-tested in [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) — every one resolved via mechanisms 1-5 above. That's the policy validating itself, not an assumption.

## Architectural Maturity Rule

A companion constraint to the same end: no implementation is scoped to only the milestone building it. Before a manager ships, it's checked against the next five milestones' known needs (from [08_MILESTONES.md](08_MILESTONES.md)) — not by building speculative code for them now, but by confirming the *shape* of the contract won't need to break to reach them. [milestone-2-architecture-rfc.md](milestone-2-architecture-rfc.md)'s registry generalization and [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)'s scenario walkthrough are exactly this check, run explicitly rather than assumed.

The other half of this rule matters equally: **avoid speculative abstraction.** A plugin marketplace, a generic "quality tier" enum baked into every manager's constructor, a config system for features that don't exist yet — none of that survives contact with real requirements better than building it when the requirement is real. [15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md)'s scenario 10 (Future Plugin Marketplace) is the worked example of correctly saying no to this. The test isn't "could this theoretically be more flexible" — it's "does a named, roadmapped milestone actually need this shape to not break."

## Related

[15_ARCHITECTURE_FREEZE.md](15_ARCHITECTURE_FREEZE.md) · [01_ARCHITECTURE.md](01_ARCHITECTURE.md) · [10_ADR_GUIDELINES.md](10_ADR_GUIDELINES.md) · [milestone-2-architecture-rfc.md](milestone-2-architecture-rfc.md)
