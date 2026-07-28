# 09 — Creative Director Review

Every milestone ends with two passes: an *engineering review* (architecture, dedup, performance, accessibility — mechanical, pass/fail against [06_CODING_STANDARDS.md](06_CODING_STANDARDS.md)) and this Creative Director Review, which is a subjective, Awwwards-jury-style critique of the experience actually delivered.

## Process

1. Stop writing code. Use what was built as an actual user would — click, drag, resize, toggle theme, toggle reduced motion.
2. Score each category below, 1–10, against **what this milestone actually delivers** — not the full 24-phase vision. A category with no surface area yet is marked `N/A — not yet in scope`, never guessed at or padded to look complete.
3. Any category that *is* in scope and scores below **9.5** gets a concrete, specific improvement proposed and implemented before the milestone is declared done — not deferred to "later polish."
4. Record the result in `docs/reviews/milestone-<n>-creative-director-review.md`, dated, with the actual scores and what (if anything) was changed as a result.

## Categories

| Category | What it means here |
|---|---|
| Visual quality | Composition, typography, color, material/lighting fidelity of what's rendered |
| Motion quality | Timing, easing, physicality — does motion feel considered, not default |
| Interaction quality | Responsiveness, feedback, discoverability of what's interactive |
| Emotional impact | Does it produce the "how did they build this?" reaction the vision doc targets |
| Originality | Does it read as distinct, or as an assembly of familiar patterns |
| Accessibility | Reduced motion, keyboard, semantics, contrast — as experienced, not just as audited |
| Performance | Real frame rate/responsiveness under actual interaction, not just a synthetic score |
| Architecture | Does the code support what's coming next without rework (per the registry/contract pattern) |
| Scalability | Would this hold up as more features/content/traffic are added |

## Scoring is not a formality

A 9.5 threshold with the option to mark categories `N/A` only works if `N/A` is used honestly — for categories genuinely unbuilt, never as a way to dodge a low score on something that *was* built. If in doubt, score it.

## Related

[00_SYSTEM_PROMPT.md](00_SYSTEM_PROMPT.md) · [08_MILESTONES.md](08_MILESTONES.md) · [reviews/](reviews/)
