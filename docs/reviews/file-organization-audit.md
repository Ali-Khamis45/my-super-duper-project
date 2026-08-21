# File & Folder Organization Audit

## Purpose

A close-out/hygiene pass, not a feature sprint: audit both trees (`src/`, `backend/src/`) against this project's own established conventions and standard Next.js App Router / .NET Clean Architecture practice, fix what's genuinely out of place, and be honest about what didn't need fixing. No logic changes; no Sprint 5.6 work.

## What was audited

- **Frontend naming/casing**: every `src/features/*/` folder name, and every subfolder within them, checked for kebab-case consistency and singular-vs-plural drift.
- **File placement**: every file sitting directly in a feature's root (not `components/`/`hooks/`/`lib/`/`data/`) — checked whether it's a one-off stray or an established, repeated pattern.
- **Barrel/index file convention**: whether `features/` is missing `index.ts` files a sibling pattern would expect.
- **Backend layering**: whether `Domain`/`Application`/`Persistence`'s per-bounded-context subfolders (Catalog/Identity/Inventory/Ordering/Payments) stay consistent across all three layers, and whether options classes (`*Options.cs`) live in a principled location.
- **`.gitignore` coverage**: root and `backend/.gitignore`, checked against what's actually untracked-but-present on disk (build artifacts, IDE files, logs).
- **README accuracy and coverage**: every existing `README.md` compared against the code it describes; checked for any feature folder missing one where its siblings all have one.
- **Repo-root clutter**: anything sitting untracked at the repo root that shouldn't be there.

## What was found

**The structure itself was already sound.** Specific things checked and found consistent, not requiring any `git mv`:

- Every `features/*/` folder name is kebab-case; the singular-vs-plural split (`cart`/`composer`/`concierge` singular, `orders`/`payments` plural) tracks real domain meaning, not inconsistency — a feature naming a singular *experience* is singular, one naming a *collection* is plural.
- `types.ts` sitting at a feature's root (7 of 13 features: `ai-barista`, `cart`, `composer`, `concierge`, `menu`, `onboarding`, `storytelling`) is a real, repeated, deliberate pattern for feature-level shared types that don't belong under `components/`/`hooks/`/`lib/` — not a violation to "fix" by moving them into a subfolder.
- Barrel (`index.ts`) files exist only in `engine/` and `design-system/tokens/` — cross-cutting systems consumed from many places. Zero `features/*/` folders have one, consistently, because each is consumed only by its own route file. This is the established pattern, not a gap.
- Backend bounded-context subfolders (`Catalog`/`Identity`/`Inventory`/`Ordering`/`Payments`) are identical across `Domain`, `Application`, and `Persistence`. Domain exception files follow one exact naming shape in all five contexts (`<Context>/Exceptions/<Context>DomainExceptions.cs`).
- `PaymentRetryOptions.cs` (Application layer) and `PaymentsOptions.cs` (Infrastructure layer) look like a placement inconsistency at first glance — same bounded context, two different projects. They're not: `PaymentRetryOptions` is read only by an Application-layer command handler, `PaymentsOptions` only by Infrastructure-layer gateway construction, and Clean Architecture's own dependency rule (Application must never reference Infrastructure) is exactly why they can't share a location. Moving either would violate the rule the split exists to enforce.
- `.gitignore` (root and `backend/`) already covers `bin/`/`obj/`, `.vs/`/`.idea/`/`*.user`, test artifacts, `.next/`, logs, env files, and `.tsbuildinfo` — no untracked IDE/build artifact was found on disk that isn't already ignored.
- `e2e/*.spec.ts` naming and the `e2e/helpers/` subfolder are already fully consistent.

**Real gaps found and fixed** — all documentation, zero logic, zero moves:

1. `src/features/auth/README.md` was missing. Every sibling feature (`cart`, `composer`, `concierge`, `customizer`, `hero-cup`, `menu`, `onboarding`, `orders`, `payments`, `storytelling`, `ai-barista`, `admin`) has one; `auth` — arguably the most foundational feature, shipped Sprint 5.1 — did not. Added, following the same Architecture/Flow/Responsibilities/Known simplifications/Future extension template `features/payments/README.md` established, built from the real current contents of `features/auth/`, `lib/auth-client.ts`, and `stores/auth-store.ts` (not invented).
2. Root `README.md` made no mention of `backend/` at all — a reader would have no idea a real ASP.NET Core commerce backend exists behind five shipped sprints of work, or how to run it. Updated to mention the backend, link to its own README, and clarify which routes work frontend-only vs. need the backend running.
3. `backend/` had no `README.md` at all — a 7-project Clean Architecture solution with zero onboarding doc. Added, with real, verified commands (docker-compose ports cross-checked against `docker-compose.yml`, the Development-only auto-migrate-on-startup behavior confirmed against `Program.cs` before being documented, current test count confirmed via a fresh `dotnet test` run).
4. Two stray, session-generated debug log files (`frontend-run.log`, `full-regression.log`) were sitting untracked at the repo root — already `.gitignore`d, so never a real git-tracking risk, but real filesystem clutter. Deleted.

## What was deliberately not done

Nothing found during this audit crossed into an actual logic change, so nothing was deferred as an out-of-scope proposal. The honest outcome of this pass is that the codebase's real organization was already close to as good as it gets — the gaps were exclusively in documentation describing that structure, not in the structure itself.

## Verification

No code was moved or renamed, so no import ever needed fixing — but the full verification pass was still run, per this project's own discipline of never assuming "just docs" is risk-free:

| Check | Result |
|---|---|
| `dotnet build` | Clean (0 errors, 2 pre-existing unrelated NuGet advisory warnings) |
| `dotnet test` | **306/306** (176 Domain + 85 Application + 45 Integration) |
| `tsc --noEmit` | Clean |
| `eslint` | Clean |
| `vitest run` (full suite) | **305/305** |
| `cart.spec.ts` + `payments.spec.ts` (Chromium) | 16/16 |
| `orders.spec.ts` (Chromium, standalone) | 5/5 |
| `admin-orders.spec.ts` (Chromium, standalone) | 5/5 |

`orders.spec.ts`/`admin-orders.spec.ts` initially failed when run together in one invocation (2 failures, both a registration timeout) — confirmed via API log correlation as the same, already-documented `AuthPolicy` rate-limiter friction this project's sprint reviews have named since Sprint 5.2, not a real regression. Rerun standalone against a fresh backend restart, both passed cleanly, matching this project's own established verification methodology for registration-heavy spec files.

## Final recommendation

No further reorganization work is warranted at this time. The four documentation gaps found are closed. Revisit this audit if/when a future sprint adds enough new bounded contexts (Coupons, Notifications, CMS — see `explain.md`) that the current flat `features/` layout starts to strain, but that point hasn't been reached yet.
