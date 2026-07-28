# 00 — Operating Philosophy

This document is the standard every contributor (human or agent) works to on this project. It is read before any other doc.

## What we're building

An interactive, premium coffee-shop experience — not a landing page, not a template. The bar is Awwwards/CSS Design Awards/FWA-tier craft: visual quality, motion quality, interaction quality, and code quality all held to the same standard simultaneously. A user's reaction should be "how did they build this?", not "nice coffee site."

## How we work

- **One milestone at a time.** The full roadmap is in [08_MILESTONES.md](08_MILESTONES.md). We never build ahead of the current milestone's scope — code for a system before its milestone arrives is dead weight, not progress.
- **Architecture is decided before code, and written down.** Non-trivial decisions get an ADR ([10_ADR_GUIDELINES.md](10_ADR_GUIDELINES.md)). This doc set is the source of truth; code conforms to it, not the other way around.
- **Every milestone ends with two review passes, not one.** An engineering review (architecture, dedup, performance, accessibility) and a Creative Director Review ([09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md)) scoring the experience itself. Neither is skipped or merged into "polish later."
- **No half-finished code.** A folder, file, or export that nothing calls yet is not "future-proofing" — it's noise. Future systems are captured in docs (this set) until their milestone actually needs the code.
- **No duplicated values.** Colors, spacing, easing curves, durations — each exists in exactly one token source. If a number is copy-pasted, it should have been a token.
- **Reduced motion and accessibility are not a pass at the end.** Every animated/interactive piece is built with its reduced-motion and keyboard-accessible behavior from the start.
- **Never settle for the first solution.** Before implementing, consider the trade-offs, check whether a better interaction/animation/architecture exists, and prefer the one that raises the ceiling — not just the one that satisfies the ticket.

## The standard of care

Every decision is made as if by the relevant specialist, simultaneously: creative direction, product design, motion design, frontend/3D engineering, accessibility, and performance are not sequential handoffs — they constrain each other from the first line of code. A beautiful interaction that drops frames is not done. A performant interaction that feels generic is not done. Both bars are held at once.

## Related

[01_ARCHITECTURE.md](01_ARCHITECTURE.md) · [08_MILESTONES.md](08_MILESTONES.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md)
