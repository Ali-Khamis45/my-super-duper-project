# Coffeshop — Full Project Report

A single source of truth for where this project actually stands: what's built, what's verified, what's known-broken-or-missing, and what's left. Written from the real codebase and the project's own sprint reviews, not from the original plan — where reality and plan diverge, this follows reality.

**Last updated:** 2026-08-21

---

## 1. What this project is

An Awwwards-tier interactive coffee shop experience: a live, draggable 3D coffee cup (React Three Fiber), a full drink customizer, an AI-assisted recommendation concierge, cinematic scroll storytelling, and — since Milestone 5 — a real commerce backend (accounts, catalog, ordering, inventory, payments) behind it. Not a static site with a 3D hero bolted on; the 3D layer and the commerce layer are both real, live systems.

**Stack:**
- Frontend: Next.js (App Router) + React + TypeScript, Tailwind v4, Zustand, TanStack Query, Framer Motion + GSAP + Lenis, Three.js + React Three Fiber + drei.
- Backend: ASP.NET Core 10, Clean Architecture (Domain/Application/Infrastructure/Persistence/Api), CQRS via MediatR, PostgreSQL, Redis (provisioned, see §4), Mailhog (dev SMTP), Seq (structured logging).
- Testing: Vitest (frontend unit), xUnit (.NET unit/integration, real Testcontainers Postgres), Playwright (e2e, 3 browsers).

**Process this project runs under:** every milestone/sprint ends with an adversarial review (architecture, security, performance, accessibility) and a written review doc in `docs/reviews/`. Real bugs get found and fixed as a matter of course, not as an exception. Nothing ships silently — gaps that aren't fixed get explicitly written down as known limitations rather than glossed over. This report inherits that discipline: it says what's actually true, including the unflattering parts.

---

## 2. Architecture at a glance

```
src/
  app/                    Next.js routes
  engine/                 cross-cutting 3D/motion/interaction systems (camera, effects,
                           theme, graphics, analytics, physics, shaders, interaction)
  design-system/          tokens, primitives, theming
  features/               one folder per user-facing feature (see §3)
  stores/                 Zustand stores (cart, customizer, concierge, ui)
  lib/                    API clients per backend bounded context

backend/src/
  Coffeshop.Domain/           entities, value objects, domain events, invariants
  Coffeshop.Application/      CQRS commands/queries, MediatR pipeline, DTOs
  Coffeshop.Infrastructure/   gateways, email, DI wiring, options
  Coffeshop.Persistence/      EF Core, migrations, repositories
  Coffeshop.Identity/         ASP.NET Identity integration
  Coffeshop.Api/               minimal-API endpoints, auth, error handling
  Coffeshop.SharedKernel/     base types shared across layers
```

The frontend's `engine/` layer is the same idea as the backend's Clean Architecture split: reusable, feature-agnostic systems (camera rigs, material factories, the interaction/gesture recognizer, analytics) that every feature composes rather than reimplements. This pattern held for the whole project — no feature was ever caught reinventing camera or motion logic.

---

## 3. What's done — milestone by milestone

### Milestone 1 — Foundation + Hero *(shipped)*
Governance docs, design system, full-viewport hero with a procedural (no external 3D assets) R3F coffee cup — idle float, drag-rotate, mouse parallax, touch support, PBR materials, HDRI lighting, contact shadows, bloom. Nav, dark/light theme. Two real accessibility contrast bugs found and fixed.

### Milestone 2 — Steam & Lighting Depth, Sprints 2.1–2.6 *(shipped, tagged `v1.0.0-engine`, frozen)*
Built the reusable 3D engine layer for real: asset/resource loading with LRU caching, a material/surface system (7 surface types), a shader pipeline (Shader Manager + uniform blocks, including a real animated steam-noise shader replacing the Milestone 1 placeholder), a 5-tier adaptive quality system (verified under real CPU throttling), and — starting here — the Playwright e2e test harness plus an internal Engine Health Dashboard. 150 unit tests by the end of this milestone.

### Milestone 3 — Experience Layer, Sprints 3.1–3.9 *(shipped)*
This is where the product became a real coffee shop, not just a hero cup:
- **3.1** `/menu` — 14 drinks, 4 categories, search/filter.
- **3.2** `/customize` — live cup customizer: color, size, sleeve, lid, logo, finish, undo/redo, saved presets.
- **3.3** Drink Composer — drag/click/keyboard ingredient layering with compatibility rules.
- **3.4** Liquid & coffee physics — spring-damper tilt/ripple/foam-lag reacting to cup rotation (a tuned spring simulation, not a physics engine).
- **3.5** `/concierge` — AI Coffee Concierge, a **deterministic, explainable rule engine** (explicitly not an LLM at this stage) that recommends a drink and shows its reasoning.
- **3.6** Cart & checkout — `RecipeSnapshot` model, guest checkout by name/email only (no real payment yet at this point — that came in Sprint 5.5).
- **3.7** `/story` — 7-chapter cinematic scroll narrative (GSAP ScrollTrigger), cup-assembly reveal, a 7-mood lighting arc synced to scroll position.
- **3.8** RC1 polish pass — audited and fixed ~40 issues (AI scoring bug, perf re-renders, dead shader uniforms); a few things were explicitly deferred rather than risked (see §4).
- **3.9** Final product experience — first-run onboarding tour, camera zoom/scale controls, brand refresh, and the **AI Barista**: a real conversational assistant backed by a local Ollama LLM (`POST /api/ai-barista/chat`) — a hybrid design where the LLM converses naturally but a deterministic engine still picks the actual recommended drink, so the AI never "invents" a menu item.

By the end of Milestone 3: 280 unit tests, 241 e2e tests across 3 browsers.

### Milestone 5 — Real Commerce Platform *(in progress, most recently active)*

> Note on numbering: "Milestone 5" originally meant something else ("Ingredient Builder & Menu" — that work happened instead inside Sprints 3.1/3.3). The number was reused for the real commerce backend. The docs are self-aware about this; this report just flags it so it isn't confusing.

A real ASP.NET Core backend was built from scratch starting here, replacing what had been frontend-only static/mocked data.

| Sprint | Scope | Status |
|---|---|---|
| 5.0 | Architecture Freeze — 12 stress-test scenarios, DDD model, risk register, all frozen before code | Approved |
| 5.1 | **Authentication Platform** — accounts, JWT + rotating refresh tokens, RBAC (Customer/Staff/Admin, 11 permissions), email verification, password reset | Shipped |
| 5.2 | **Product Platform** — real `Product`/`Category`/`Ingredient` aggregates, Postgres full-text search, first `/admin` area | Shipped |
| 5.3 | **Ordering Platform** — real `Order` aggregate, order lifecycle, `/orders`, first Staff-reachable admin area | Shipped |
| 5.4 | **Inventory & Stock Management** — real stock reservation/consumption tied into the order lifecycle, `/admin/inventory` | Shipped |
| 5.5 | **Payments Platform** — real payment gateway abstraction (`FakePaymentGateway` for dev, `StripePaymentGateway` wired), checkout charges a real payment, refunds, `/admin/payments` | Shipped, **verified locally, not yet pushed to origin/main** (see §7) |
| 5.6 | Production Readiness (originally sketched as CI/CD, OpenTelemetry, secrets, multi-replica deploy) | **Not started** — gated behind explicit approval |

**Sprint 5.5 in numbers:** 306 backend tests (176 Domain + 85 Application + 45 Integration), 302 frontend tests, 26/26 e2e passing on both Chromium and Firefox for the Payments/Orders regression suite, full 3-browser regression run (351 tests) with every failure individually root-caused — zero were real Payments regressions.

Each shipped sprint above found and fixed real bugs during its own review (double-charge races, an unreachable command path, an idempotency-key double-submit bug, a token-reuse-detection over-broad-revocation bug, and more) — this is normal, expected process here, not a red flag.

---

## 4. Known open gaps, bugs, and limitations

Everything below is **known and disclosed**, not newly discovered by writing this report — pulled from the project's own sprint reviews and risk register.

### Money/security-relevant (highest priority if picking up work)
- **`CancelPaymentCommand` has no gateway-level void/cancel call.** It only changes local state; there's no `IPaymentGateway.Cancel/Void` method at all yet. Mitigated (a captured payment can't be silently cancelled, and a late webhook success after local cancellation is logged as an error for manual reconciliation) but **not fixed**. This is the single most important item to close before this is truly production-ready.
- No reconciliation sweep job for out-of-order webhooks, and the payment gateway abstraction has only been validated against one vendor shape (Stripe) — a second real provider hasn't stress-tested the interface.
- No real `ETag`/`If-Match` optimistic-concurrency pattern anywhere — conflicts are caught after the fact (a 409 from EF Core's own row-version check), not avoided proactively.
- No GDPR/CCPA data export/deletion flow exists.
- `npm audit` flags 3 high-severity transitive CVEs in Next.js's bundled `postcss`/`sharp` — confirmed unreachable in this app's actual code paths, tracked, waiting on an upstream Next.js patch rather than a workaround.

### Real, disclosed, out-of-scope-for-now bugs
- A cross-browser (WebKit/Firefox) race in the HDRI environment-texture loader can surface a console error on rapid route navigation — root-caused, filtered out of test assertions rather than fixed, since it lives in frozen Milestone-2 engine code and this project's Zero Rewrite Policy blocks touching frozen systems without a dedicated pass.
- Camera framing clips the cup's lid at some common viewport heights on Hero/Customizer/Concierge — confirmed via screenshot, deliberately not fixed without a dedicated visual-QA pass.
- `admin-inventory.spec.ts`'s own test file trips the auth rate limiter from its own login cadence in isolation (not a Payments-related issue) — the rate limiter is working as designed, the test file's structure is what's dated.
- WebKit registration-form submission is unreliable on the dev machine used for testing — a general Playwright/WebKit/Windows characteristic, not an app bug, documented since it was first hit.
- No real-time updates (SignalR) for orders/inventory — a second open tab/viewer needs a manual reload to see a change.
- A narrow residual double-order race exists at true microsecond-level simultaneous requests (extremely rare); the loser gets a 500 instead of a graceful dedup message, though the database itself never ends up in a bad state (only one order ever actually persists).

### Fixed this session (informational — see explain.md history for detail if needed)
- The 3D cup canvas on `/customize` and `/concierge` was capturing every mouse-wheel tick for camera zoom, which blocked page scroll whenever the cursor was over the cup — meaning the "Add to Cart" button / AI recommendation could become unreachable by scroll. Fixed: those two routes now require holding Ctrl/Cmd to zoom by wheel; a bare wheel scrolls the page. (Hero's own full-viewport wheel-zoom is unchanged — it's correct there.)

### Engineering debt / unresolved design questions
- Redis has been provisioned in `docker-compose.yml` since Sprint 5.0 but **is not consumed by any real backend code today** — confirmed via a direct source grep, zero `IDistributedCache`/`StackExchange.Redis` usage. Rate limiting, caching, and the SignalR backplane it was provisioned for are all still using in-memory alternatives or don't exist yet.
- The frozen DDD model states "no command handler ever touches two aggregate roots from two different bounded contexts in one transaction" — this rule is **knowingly violated by design** in the Inventory↔Ordering and Payments↔Ordering integration points, because the alternative (eventual consistency via the outbox) can't answer "is this order actually paid/in-stock" fast enough. This is disclosed and reasoned in the relevant sprint reviews, but it's a real, permanent deviation from a document literally named "frozen," worth knowing about before extending either area.
- A full GLB/KTX2 3D-asset pipeline (import, compression, LOD) was built and tested in Milestone 2 and has never been used — the cup and every part remain fully procedural geometry to this day. Either commit to sourcing real assets or consider retiring the unused pipeline.
- `useGestureRecognizer`'s more general-purpose gesture vocabulary is built and tested but has real production consumers only for cup zoom — worth revisiting if more DOM-native (non-3D) gesture-driven UI is planned.
- Known non-deterministic WebGL visual-regression noise and resource-contention flakiness under parallel test execution on the single dev machine used for CI-equivalent runs — documented since Sprint 2.6, recurs almost every sprint, never fully root-caused (likely just a real limitation of one machine running everything).

---

## 5. Designed but not yet built

These have real, frozen architecture (aggregates, value objects, domain events already specified in `docs/30_COMMERCE_DDD_MODEL.md`) but **zero backend implementation**. Building any of these is additive — it doesn't require touching existing shipped systems (Zero Rewrite Policy holds here on purpose).

| Bounded context | What it would add | Design status |
|---|---|---|
| **Promotions / Coupons** | `Coupon` aggregate — percentage/fixed/free-item/free-delivery rules, usage limits, redemption tracking | Fully designed, not started |
| **Notifications** | A real notification queue beyond today's inline auth emails — order-status emails, receipts as a first-class tracked send, not just a direct SMTP call | Fully designed, not started |
| **Content / CMS** | `ContentBlock` aggregate — would make storytelling chapter copy, onboarding text, and the AI Barista's system prompt editable by staff instead of hardcoded in frontend files | Fully designed, not started |
| **Reviews & Favorites (backend)** | `Review` aggregate; a real backend `Favorite` (today favoriting is frontend-only, in `cart-store.ts`, with no server record) | Fully designed, not started |
| **Platform / Admin extras** | `AuditLogEntry`, `SettingEntry`, real media/blob upload (`IBlobStorageProvider` designed; admin currently takes image URLs only, no real file upload), Analytics as a real read-projection | Fully designed, not started |
| **Production infrastructure** (the original Sprint 5.5 sketch, superseded by Payments) | Production Docker profile, OpenTelemetry tracing, real CI/CD pipeline, secrets management, SignalR Redis backplane validated under multi-replica load | Designed, not started — this is essentially what Sprint 5.6 should be |
| **Search upgrade** | `ISearchService` is an engine-agnostic contract today implemented only via Postgres full-text search (tsvector/GIN + trigram autocomplete); Elasticsearch is a documented future swap-in | Contract designed for it, no second implementation |

---

## 6. Never scoped — long-term vision only

From the project's original 24-phase vision document, explicitly never built and not currently planned:

- **Audio** — no ambient café sound, no interaction sound effects. Considered twice (Milestone 2, Sprint 3.7) and declined both times for lack of a real forcing need, per this project's own "no half-finished code" standard.
- **A true liquid coffee-pour transition** (bottom-up fill shader on checkout/customize) — investigated in Sprint 3.7, scoped out.
- **Loyalty points / multi-fulfillment delivery** — `FulfillmentMethod` today has exactly one member (`Pickup`); named as a clean future extension point, never implemented.
- Real GLB/KTX2 3D assets replacing the procedural cup (see §4 — the pipeline exists, the assets don't).

---

## 7. Current repository state (as of this report)

- **Local commits ahead of `origin/main`: 3** (`699d4bf`, `b18c815`, `18d124a` — the full Sprint 5.5 Payments Platform close-out). **These have not been pushed** — the push was blocked by this session's own permission classifier and, per explicit instruction, was not force-retried. Someone needs to either push manually or grant push permission.
- **5 files currently uncommitted** in the working tree: the wheel-scroll fix from this session (`useGestureRecognizer.ts`/`.test.ts`, `useCupZoomControls.ts`, `CustomizerCanvas.tsx`, `ConciergeCanvas.tsx`). Verified (9/9 relevant unit tests, full suite 305/305, `tsc`/`eslint` clean) but not yet committed.
- **Sprint 5.6 has not started** and should not start without explicit approval — this project runs on an explicit phase-gate rhythm, and that gate is still open.
- The local dev stack (Postgres, Redis, Mailhog, Seq via Docker, plus the .NET API and Next.js dev server) is currently running for inspection purposes.

---

## 8. Recommended next steps, roughly in priority order

1. **Get the 3 pending commits pushed and the uncommitted scroll fix committed.** Nothing else matters if this work isn't actually landed.
2. **Close the `CancelPaymentCommand` gateway-void gap** — the single highest-severity real gap in the project today, since it's money-adjacent.
3. **Decide what Sprint 5.6 actually is.** Two honest candidates: (a) the originally-sketched Production Readiness work (CI/CD, observability, real deploy) — makes sense if the goal is to actually launch this; or (b) one of the designed-but-unbuilt commerce contexts (Coupons is probably the highest-leverage one — it's fully designed and would let a real promotional launch happen). Either is legitimate; it depends on whether the immediate goal is "ship to real users" or "grow the commerce feature set" first.
4. Consider whether the unused GLB/KTX2 asset pipeline should be used (source real 3D assets) or retired — it's dead weight either way right now.
5. If real users are coming soon: the GDPR/CCPA gap and the second-payment-provider validation gap both become non-optional at that point, not nice-to-haves.
