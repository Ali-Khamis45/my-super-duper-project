# 39 — Commerce Implementation Readiness

Phase 0 deliverable, mirroring [25_IMPLEMENTATION_READINESS.md](25_IMPLEMENTATION_READINESS.md)'s format exactly. For each of Sprints 5.1-5.6: Prerequisites, Deliverables, Exit criteria, Verification steps, Rollback strategy, Dependencies. Sprint 5.0 is this Architecture Freeze itself (docs 29-40) — its own exit criterion is [40_COMMERCE_RC0_APPROVAL.md](40_COMMERCE_RC0_APPROVAL.md)'s go/no-go declaration, not a row in this table.

## Rollback strategy, the general case

Unlike [25_IMPLEMENTATION_READINESS.md](25_IMPLEMENTATION_READINESS.md)'s frontend sprints, these are **not** all backward-compatible-by-construction in the same trivial sense — a backend sprint typically ships a real database migration alongside code, and reverting code without reverting (or at minimum leaving inert) the schema change is a real hazard specific to this domain. The general case here is therefore two-part: **(1) revert the sprint's application code commits** (safe, same as the frontend case, since [37_API_STABILITY_POLICY.md](37_API_STABILITY_POLICY.md) means no later sprint's contract silently depends on an earlier sprint's internals), **and (2) leave the sprint's migrations applied but inert** rather than rolling the schema back — an added-but-unused table/column is harmless; a reverse migration run against a database that's already accumulated real rows from the reverted feature is where real data loss risk lives. A genuine schema rollback is only ever a last resort, called out explicitly per sprint below where it applies.

## Sprint 5.1 — Authentication Platform

| | |
|---|---|
| Prerequisites | [40_COMMERCE_RC0_APPROVAL.md](40_COMMERCE_RC0_APPROVAL.md) go decision; Docker Compose dev stack ([35_INFRASTRUCTURE_AND_DEPLOYMENT.md](35_INFRASTRUCTURE_AND_DEPLOYMENT.md)) running locally |
| Deliverables | `User`/`RefreshToken`/`RoleDefinition` aggregates + EF Core migrations; register/login/refresh/forgot-password/reset-password endpoints per [33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md)'s sequence diagrams; seeded `Customer`/`Staff`/`Admin` roles; rate limiting + audit logging wired ([36_SECURITY_MODEL.md](36_SECURITY_MODEL.md)); new frontend `lib/auth-client.ts` + `stores/auth-store.ts` |
| Exit criteria | Every sequence diagram in [33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md) verified against the real running system, including the reuse-detection revoke-all path (deliberately triggered, not just theorized); OpenAPI-generated TS client type-checks against the new `auth-store.ts`; zero existing frontend store gained a required (non-optional) new dependency |
| Verification steps | Integration tests against ephemeral Postgres/Redis (per [35_INFRASTRUCTURE_AND_DEPLOYMENT.md](35_INFRASTRUCTURE_AND_DEPLOYMENT.md)'s CI shape) covering every branch in the four sequence diagrams; a manual live-browser pass (register → verify → login → silent refresh across a tab-close → logout-everywhere) |
| Rollback | General case applies. The `User` table itself has no prior data to protect (this is its first sprint), so even a full schema rollback is low-risk here specifically — the one sprint in this doc where that's true |
| Dependencies | None outside this sprint (first commerce sprint after the freeze) |

## Sprint 5.2 — Product Platform

| | |
|---|---|
| Prerequisites | Sprint 5.1 merged (JWT/permission middleware needed to protect the new admin-only product-mutation endpoints) |
| Deliverables | `Product`/`Ingredient`/`Category`/`InventoryItem` aggregates + migrations; seed migrations from `features/menu/data/drinks.ts`/`features/composer/data/ingredients.ts` ([31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md)); catalog read endpoints + Redis read-through cache; PostgreSQL full-text search + autocomplete ([34_PAYMENTS_NOTIFICATIONS_SEARCH.md](34_PAYMENTS_NOTIFICATIONS_SEARCH.md)) |
| Exit criteria | `ProductDto`/`IngredientDto` type-check against `Drink`/`Ingredient` with zero shape drift (the tracing table in [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md) re-verified against real, not sketched, DTOs); seeded catalog renders correctly in the existing, unmodified `features/menu/` and `features/composer/` UI with zero component changes; the discontinued-product/order-history integration test from [38_COMMERCE_RISK_REGISTER.md](38_COMMERCE_RISK_REGISTER.md) C-07 passes |
| Verification steps | Swap the frontend's mock data import for the new adapter behind a feature flag in dev, confirm pixel-identical menu/customizer rendering; search relevance spot-checked against the real seeded catalog, not a synthetic one |
| Rollback | General case applies. Schema note: `InventoryItem` starts alongside `Product` in this sprint — no prior inventory data exists yet either, so this sprint shares Sprint 5.1's "low-risk-even-for-full-rollback" property |
| Dependencies | Sprint 5.1 (auth middleware for admin mutation endpoints) |

## Sprint 5.3 — Ordering Platform

| | |
|---|---|
| Prerequisites | Sprints 5.1-5.2 merged (orders reference both users and products) |
| Deliverables | `Cart`/`Order`/`Coupon`/`Payment` aggregates + migrations; `IInventoryReservation` (Redis); `IPaymentProvider` + one concrete implementation (Stripe, per the brief's own priority ordering); outbox dispatcher (Hangfire) live for the first time; the full order-placement flow ([32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md)'s worked example) end to end; SignalR order-status push; existing `stores/cart-store.ts`'s `placeOrder()` adapter-swapped to the real endpoint |
| Exit criteria | Every numbered scenario in [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) that touches Ordering (1, 2, 3, 4, 5, 8, 10) re-verified against the real running system, not just the design; C-01/C-02/C-04/C-06 from [38_COMMERCE_RISK_REGISTER.md](38_COMMERCE_RISK_REGISTER.md) explicitly tested (retry-idempotency, webhook-delay reconciliation, concurrent coupon redemption load test, Redis-kill-mid-checkout chaos test); `cart-store.ts`'s public shape unchanged per [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) — verified by the existing frontend test suite passing unmodified against the adapter-swapped store |
| Verification steps | The chaos/load tests above; a real, manual guest-checkout-through-payment-through-order-ready walkthrough in a browser using the payment provider's test mode |
| Rollback | **Exception to the general case**: this sprint is the first to accept real (test-mode) payment traffic and the first to touch inventory debits against Sprint 5.2's seeded stock. A code-only rollback is still safe (no later sprint depends on Ordering internals), but any `Order`/`Payment` rows created during a botched rollout should be reconciled against the payment provider's own dashboard before being discarded, not silently deleted |
| Dependencies | Sprints 5.1, 5.2 |

## Sprint 5.4 — Administration Platform

| | |
|---|---|
| Prerequisites | Sprints 5.1-5.3 merged (the admin dashboard surfaces users, products, and orders, all of which must already exist) |
| Deliverables | New `/admin` route (frontend, entirely new — no existing route modified); `Review`/`Favorite`/`ContentBlock`/`AuditLogEntry`/`SettingEntry`/`MediaAsset` aggregates + migrations; `IEmailProvider`/`IBlobStorageProvider` concrete implementations; admin CRUD endpoints for products/categories/content/coupons; analytics read-side projections |
| Exit criteria | C-05 from [38_COMMERCE_RISK_REGISTER.md](38_COMMERCE_RISK_REGISTER.md) resolved (every mutable admin endpoint reviewed for `ETag`/`If-Match` support, not just the ones built first); every admin mutation produces a real, queryable `AuditLogEntry` ([36_SECURITY_MODEL.md](36_SECURITY_MODEL.md)'s security-events list re-verified against real log output); `/admin` reachable only under the `Admin`/`Staff` permission policies, verified by an explicit "logged in as Customer, `/admin` returns 403" test |
| Verification steps | A full admin walkthrough (create product → publish CMS content → view analytics → process a refund) in a real browser; permission-boundary tests for each role |
| Rollback | General case applies — `/admin` is a wholly new route, no existing frontend surface is touched |
| Dependencies | Sprints 5.1, 5.2, 5.3 |

## Sprint 5.5 — Infrastructure Platform

| | |
|---|---|
| Prerequisites | Sprints 5.1-5.4 merged (there's a real application to deploy) |
| Deliverables | Production Docker Compose profile; OpenTelemetry/Serilog wired end to end; health checks; CI pipeline (build/test/image build/push) per [35_INFRASTRUCTURE_AND_DEPLOYMENT.md](35_INFRASTRUCTURE_AND_DEPLOYMENT.md); secrets management wired to the target cloud provider; SignalR Redis backplane verified under a real multi-replica run for the first time |
| Exit criteria | A rolling deploy (replica count ≥2) demonstrably serves traffic through the deploy with zero dropped requests (readiness-probe-gated); the intentional migration-failure drill (C-13, [38_COMMERCE_RISK_REGISTER.md](38_COMMERCE_RISK_REGISTER.md)) halts the deploy as designed; a trace spanning frontend request → API → payment provider call is visible end to end in the tracing backend |
| Verification steps | The rolling-deploy test and migration-failure drill above, run against a real staging environment, not just locally |
| Rollback | Infrastructure-specific: a bad CI/CD or Compose change rolls back via the previous known-good image tag, not a code revert — this sprint's own artifact *is* the deployment mechanism, so "rollback" means redeploying the prior version, which the pipeline itself must support (verified as part of this sprint's own exit criteria, not assumed) |
| Dependencies | Sprints 5.1-5.4 |

## Sprint 5.6 — Production Readiness

| | |
|---|---|
| Prerequisites | Sprint 5.5 merged (needs a real deployed environment to harden) |
| Deliverables | Load testing against realistic traffic shapes; security review pass against [36_SECURITY_MODEL.md](36_SECURITY_MODEL.md)'s full threat table; documentation finalization; final Creative Director Review extended to cover the new `/admin` surface and checkout flow (per this project's existing per-milestone gate, [09_CREATIVE_DIRECTOR_REVIEW.md](09_CREATIVE_DIRECTOR_REVIEW.md)) |
| Exit criteria | Every row in [38_COMMERCE_RISK_REGISTER.md](38_COMMERCE_RISK_REGISTER.md) marked "Open" has either moved to "Mitigated"/"Accepted" with real evidence, or is explicitly carried forward with a named owner and reason — no silent drop; CDR pass ≥9.5 on every in-scope category for the new `/admin` and checkout surfaces, matching the bar every prior milestone has held |
| Verification steps | The load test, the security review checklist, and the CDR process itself |
| Rollback | General case applies; by this sprint, any rollback of a specific finding's fix is scoped to that finding, not the whole sprint — matching the "Improvement Loop" precedent from [25_IMPLEMENTATION_READINESS.md](25_IMPLEMENTATION_READINESS.md)'s Sprint 2.6 |
| Dependencies | All prior Milestone 5 sprints |

## Related

[milestone-5-commerce-rfc.md](milestone-5-commerce-rfc.md) · [38_COMMERCE_RISK_REGISTER.md](38_COMMERCE_RISK_REGISTER.md) · [25_IMPLEMENTATION_READINESS.md](25_IMPLEMENTATION_READINESS.md) · [40_COMMERCE_RC0_APPROVAL.md](40_COMMERCE_RC0_APPROVAL.md)
