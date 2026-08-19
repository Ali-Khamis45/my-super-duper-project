# 36 — Security Model

Phase 0 deliverable. The threat model and the concrete mitigations frozen against it — every mitigation here is a forward-reference resolved from docs 29-35, not new scope invented at this layer.

## Threat model

| Threat | Attack surface | Primary mitigation |
|---|---|---|
| Credential stuffing / brute force | `POST /v1/auth/login` | Rate limiting (below) + generic error response ([33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md) — never distinguishes "wrong password" from "no such account") + failed-attempt audit logging |
| Access token theft (XSS) | Any injected script in the browser | Access token held in memory only, never `localStorage` ([33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md)) — a successful XSS can still act as the user for up to 15 minutes, which is the accepted residual risk of any bearer-token scheme; the mitigation is bounding the blast radius, not claiming XSS is impossible |
| Refresh token theft | Cookie exfiltration (network, device compromise) | `HttpOnly`/`Secure`/`SameSite=Strict` closes the JS-read path entirely; rotation + reuse-detection (below) bounds a theft to a single use before it's detected and every token for that user is revoked |
| CSRF | Any state-changing endpoint | `SameSite=Strict` on the refresh cookie already blocks the dangerous case (a cross-site request can't carry it); the JWT-bearer-protected endpoints are inherently CSRF-immune (a cross-site form/script has no way to attach the in-memory access token) — no separate anti-CSRF token scheme is needed on top, and adding one would be unjustified extra surface |
| SQL injection | Any query touching user input | EF Core parameterized queries exclusively; the one place raw SQL appears (full-text search's `tsquery` construction, [34_PAYMENTS_NOTIFICATIONS_SEARCH.md](34_PAYMENTS_NOTIFICATIONS_SEARCH.md)) uses EF Core's parameterized `FromSqlInterpolated`, never string concatenation |
| Broken object-level authorization (IDOR) | Any `{id}` route (`/v1/orders/{id}`, `/v1/reviews/{id}`) | Resource-ownership `IAuthorizationHandler` on every such route ([33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md)) — checked before the handler runs, not as an afterthought inside it |
| Over-privileged admin actions | `/admin` surface, `/v1/admin/*` endpoints | Permission-based policy checks, never role-string checks ([33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md)); every admin mutation additionally writes an `AuditLogEntry` ([30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)) |
| Payment/PCI exposure | Checkout flow | Backend never touches raw card data — provider client SDKs only ([34_PAYMENTS_NOTIFICATIONS_SEARCH.md](34_PAYMENTS_NOTIFICATIONS_SEARCH.md)), keeping this out of PCI SAQ D scope |
| Denial via abusive request volume | Any public endpoint, especially search/autocomplete | Rate limiting (below) |
| Secret leakage | Source control, logs, error responses | No secret ever committed ([35_INFRASTRUCTURE_AND_DEPLOYMENT.md](35_INFRASTRUCTURE_AND_DEPLOYMENT.md)); Problem Details error bodies never include stack traces or connection strings outside `Development` (an ASP.NET Core environment check, not a manual per-endpoint discipline) |
| Guest order takeover | Guest checkout's order-lookup path | The signed, single-purpose access token ([30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md) `GuestContactInfo`) is scoped to exactly one order id, time-limited, and never a general-purpose credential — it cannot be used against any other endpoint |

## Rate limiting

Three distinct layers, deliberately not conflated (per [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) scenario 12):

| Layer | Scope | Limit shape | Backing |
|---|---|---|---|
| Global/IP | Every request | Coarse ceiling per IP, protects against volumetric abuse | ASP.NET Core `RateLimiter` middleware, Redis-backed fixed window (`ratelimit:ip:*`) |
| Auth-specific | `login`/`register`/`forgot-password` | Tighter, per-IP-and-per-email-combination window — brute-force needs a stricter limit than browsing | Same middleware, a named policy |
| Per-user/token | Authenticated API calls | Per-user quota once a request has a valid JWT, independent of which IP it came from (a mobile user switching networks shouldn't reset an abuser's budget) | Same middleware, keyed on `sub` claim |

**Fail-closed under Redis unavailability**: per [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md)'s failure-mode table, if Redis is unreachable the rate limiter rejects (429) rather than silently allowing unlimited traffic through — availability of rate limiting is treated as a security property, not just a performance nicety, so it degrades safely rather than open.

## Data protection

| Concern | Approach |
|---|---|
| Passwords | ASP.NET Core Identity's `PasswordHasher` (PBKDF2, salted, iteration count following Identity's current defaults — never a custom hash) |
| PII at rest | `Email`, `FullName`, `DeliveryAddress` are ordinary encrypted-at-rest columns (managed Postgres's disk encryption) — no column-level application encryption is introduced without a named compliance requirement driving it, consistent with this project's anti-speculation discipline |
| PII in logs | Serilog destructuring policies redact `Email`/password fields from structured log output by convention — a log line can reference a `UserId`, never a raw email/password value |
| Data export / deletion | Out of scope for Milestone 5 (no GDPR/CCPA requirement named in the brief); the `User` aggregate's shape doesn't preclude adding it later — flagged here as a known gap, not silently ignored |

## Payments security (Sprint 5.5)

The one bounded context this project's own security review found and fixed real, previously-undiscovered bugs in — recorded here rather than only in the sprint review, since these are load-bearing security properties, not incidental fixes.

| Concern | Mitigation |
|---|---|
| No card data stored | Confirmed by construction, not just policy — `PaymentMethod` (the only VO capable of holding card-adjacent data) has exactly `Type`/`Brand`/`Last4`, populated only from a gateway's own *post-charge* response, never from request input. Neither gateway implementation (`StripePaymentGateway`, `FakePaymentGateway`) has a code path that accepts a PAN/CVV from a caller. |
| Webhook signature verification | Real, not aspirational. `StripePaymentGateway.TryParseWebhook` uses Stripe's own SDK (`EventUtility.ConstructEvent`) to verify the real HMAC-SHA256 `Stripe-Signature` header. `FakePaymentGateway` implements the identical scheme by hand (`t={timestamp},v1={hmac}` over `"{timestamp}.{payload}"`) so the webhook endpoint's own code path is byte-for-byte identical regardless of which gateway is active — verification isn't bypassed in dev, it's exercised against a real (fake) HMAC every time. |
| Timing attacks on signature comparison | `FakePaymentGateway.TryVerifySignature` compares the computed and provided HMAC via `CryptographicOperations.FixedTimeEquals`, never `==`/`string.Equals` — a naive comparison would leak the correct signature one byte at a time via response-time measurement. |
| Replay protection | `IIdempotencyStore.TryReserveAsync`, keyed by the gateway's own webhook event id, checked *before* any `Payment` is touched. A deliberate, documented exception to the "one `SaveChangesAsync` per request" rule ([31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md)) — it commits the reservation atomically and immediately via its own save, so a genuine concurrent duplicate delivery hits a real unique-constraint race, not a check-then-act gap. |
| Duplicate capture | `Payment`'s own state machine — `CaptureAttempt` is only valid from `Started`/`Authorized`, never re-appliable once `Captured`; `ConfirmPaymentCommand`/`ProcessPaymentWebhookCommand` both short-circuit to a no-op the instant `Payment.Status` is no longer `Processing`. Whichever of the two "wins" the race, the other is provably a no-op, not a second charge. |
| A real double-charge risk, found and fixed | Live/E2E verification this sprint found that `PayOrderCommand` (staff manually recording a cash/out-of-band payment, Sprint 5.3) had no awareness of a real, in-flight gateway `Payment` — a customer completing a card checkout while staff simultaneously recorded the same order paid by cash could result in the card genuinely being charged *and* cash being taken, with the card side surfacing only as a confusing 409 to the customer, no automatic remediation. Fixed by a real guard: `PayOrderCommand` now throws `PaymentInProgressException` (409) if a `Pending`/`Processing` `Payment` already exists for the order. See `PayOrderCommand`'s own doc comment and docs/reviews/sprint-5.5-review.md. |
| A real money-safety gap, found and disclosed, not fixed | `CancelOrderCommand` (Sprint 5.3, unmodified) allows cancelling a `Paid` order and has zero awareness of Payments — cancelling an order whose card was genuinely charged does **not** trigger a refund. This predates Sprint 5.5 (before real Payments existed, "paid" only ever meant staff-recorded cash, so no refund mechanism was expected either), but a real card charge makes the gap materially more consequential. Not fixed this sprint — an automatic refund-on-cancel pipeline is real, non-trivial new scope with its own edge cases (partial refunds already applied, an already-non-`Succeeded` payment, etc.) that this sprint's brief never named. Disclosed here and in the sprint review as a known limitation for a future sprint, not silently left undocumented. |
| A request-cancellation data-loss bug, found and fixed | `UnitOfWorkBehavior`'s "save on exception" recovery path (added Sprint 5.1 for refresh-token-reuse-detection) reused the request's own, possibly-already-cancelled `CancellationToken` for its own recovery `SaveChangesAsync` call. A client disconnecting mid-`ConfirmPaymentCommand` (after a real capture had already mutated `Payment`/`Order` in memory, before the transaction committed) made the recovery save itself throw immediately, silently discarding an already-succeeded payment capture. Fixed by using `CancellationToken.None` for the recovery save — its entire purpose is to persist a mutation that already happened, independent of whether the original caller is still listening. This also retroactively hardens the original Sprint 5.1 refresh-token-reuse-detection scenario against the same class of disconnect-mid-revocation loss. |
| Rate limiting | `PaymentPolicy` (20 requests/min/IP) on `/payments/create-session`/`/confirm`/`/{id}/cancel` — tighter than the general `PerUserPolicy` (60/min), since these are financially meaningful actions, and IP-keyed (not user-keyed) since guest checkout has no account. The webhook endpoint is deliberately **not** rate-limited by request volume — its real gate is signature verification; a legitimate gateway's own retry cadence must never be throttled, and an attacker with no valid signing key gains nothing from volume regardless. |
| Secret management | `PaymentsOptions.StripeSecretKey`/`StripeWebhookSecret` bound from configuration, never committed; `PaymentsOptions.Provider` defaults to `"Fake"` specifically so a fresh clone with no Stripe secret configured still runs end to end rather than silently attempting a call with a missing key. |
| Audit logging | Every state-changing `Payment` action raises a real domain event (`PaymentStartedEvent`, `PaymentCapturedEvent`, `PaymentFailedEvent`, `PaymentRefundedEvent`, etc. — [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md)), landing in the same outbox every other bounded context uses; refunds specifically are admin-only (`PermissionCodes.ProcessRefunds`, Admin role only, never Staff — a real, meaningfully more sensitive action than viewing payments). |

## Security events (audit trail)

Every row in this table becomes a real, admin-queryable `AuditLogEntry` ([30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)), sourced from the events already named in [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md) plus a few security-specific ones raised directly by the auth pipeline rather than an aggregate:

`UserRegistered`, `UserLoggedIn`, `LoginFailed` (new — not in doc 32, since it's not a domain event of any aggregate; raised by the auth endpoint itself, rate-limited and logged even though no state changes), `RefreshTokenReused` (the reuse-detection trigger, [33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md)), `PasswordChanged`, `RefreshTokenRevoked`, every admin mutation (`ProductPriceChanged`, `ContentPublished`, `CouponCreated`, refunds, role changes) — the general rule being: **any action a real incident investigation would need to reconstruct gets an audit row**, not just the auth-specific ones.

## Related

[milestone-5-commerce-rfc.md](milestone-5-commerce-rfc.md) · [33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md) · [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) · [35_INFRASTRUCTURE_AND_DEPLOYMENT.md](35_INFRASTRUCTURE_AND_DEPLOYMENT.md) · [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)
