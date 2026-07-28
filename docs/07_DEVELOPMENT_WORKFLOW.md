# 07 — Development Workflow

## Build order, per milestone

1. **Governance docs first.** The docs this project runs on (this set) are written or updated *before* the code they govern, not after — Milestone 1's build order was: foundational docs (00/01/06/10) → roadmap + strategy (08, `docs/strategy/`) → ADRs for the milestone's big decisions → process docs (09/11) → scaffold → design system → engine layer → navigation → the feature itself → engineering review → Creative Director Review. Later milestones follow the same shape, scaled to what's actually being built.
2. **Docs are written against real code, not aspirational code.** `02_DESIGN_SYSTEM.md`, `03_3D_ENGINE.md`, `04_MOTION_ENGINE.md`, and the feature READMEs were drafted once the corresponding code existed, then corrected during the engineering review when the code and docs drifted (see below) — never the other way around.
3. **Two review passes at the end of every milestone, not one.** An engineering review (dead code, contract compliance, duplicated values, a11y linting, SSR-boundary verification, build) and a separate Creative Director Review (actually rendering the pages and looking at them) — see [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md).

## What actually happened in Milestone 1 — process lessons

**Doc-driven dead code is real and the engineering review caught it.** Writing the folder structure into the plan/docs before every file has a confirmed consumer produced two genuinely unused modules (`design-system/tokens/{spacing,typography,elevation}.ts`, `features/hero-cup/lib/cupConfig.ts`) — zero import edges, pure scaffolding. Both were deleted during the engineering review, and the docs that referenced them were corrected in the same pass. Lesson: a plan describing a file is not the same as that file having a reason to exist; verify with an actual reference-count check before calling a milestone done, not just "does the file compile."

**Rendering the page and looking at it is not optional for a visual feature.** Every one of the five substantial bugs in [the Milestone 1 Creative Director Review](reviews/milestone-1-creative-director-review.md) — a mispositioned lid, broken camera framing, an unsized canvas element, a silently-failing color conversion, and a renderer-config conflict that blanked the entire scene — passed `tsc`, `eslint`, and `next build` cleanly. None of them were catchable by static analysis; all five were found by taking an actual screenshot and looking at it critically. For any milestone with a visual/interactive deliverable, budget real time for this, not just for the code.

**Case-insensitive filesystems can silently corrupt git history.** On Windows, `Readme.md` (the pre-existing project file) and `README.md` (git's tracked path from the scaffold's initial commit) are the same file. Moving `.git` into a directory that already had a same-named-but-different-case file made `git status` show the tracked README as "modified" with all content deleted — not a merge conflict, no warning, just silent data loss waiting to be committed. Caught during the engineering review, fixed by writing real content. Lesson: after any scaffold/merge operation on Windows, `git status` deserves an actual read, not just a glance for "any changes."

**A tool used for verification can itself be a risk.** An early attempt to screenshot the app in headless Chrome accidentally launched the real, signed-in Chrome profile instead of an isolated instance (the `--headless` flag is silently ignored when Chrome delegates to an already-running instance of the same profile). All spawned processes were killed immediately and the approach was corrected to use an explicit, dedicated `--user-data-dir` for every subsequent run. Lesson: when a verification tool touches a real user-owned resource (a browser profile, a database, a cloud account), isolate it explicitly before the first run, not after noticing a problem.

## Commit/branch conventions

Not yet applicable — this milestone's work happened before the repository had established conventions beyond the scaffold's default `git init`. Adopt Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`) starting with the first commit made after this milestone lands, and branch per milestone (`milestone-2-steam-lighting`, etc.) rather than per-task, matching the milestone-sized review cadence this doc set is built around.

## Related

[00_SYSTEM_PROMPT.md](00_SYSTEM_PROMPT.md) · [06_CODING_STANDARDS.md](06_CODING_STANDARDS.md) · [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md) · [reviews/milestone-1-creative-director-review.md](reviews/milestone-1-creative-director-review.md)
