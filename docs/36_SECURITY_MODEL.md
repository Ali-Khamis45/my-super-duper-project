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

## Security events (audit trail)

Every row in this table becomes a real, admin-queryable `AuditLogEntry` ([30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)), sourced from the events already named in [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md) plus a few security-specific ones raised directly by the auth pipeline rather than an aggregate:

`UserRegistered`, `UserLoggedIn`, `LoginFailed` (new — not in doc 32, since it's not a domain event of any aggregate; raised by the auth endpoint itself, rate-limited and logged even though no state changes), `RefreshTokenReused` (the reuse-detection trigger, [33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md)), `PasswordChanged`, `RefreshTokenRevoked`, every admin mutation (`ProductPriceChanged`, `ContentPublished`, `CouponCreated`, refunds, role changes) — the general rule being: **any action a real incident investigation would need to reconstruct gets an audit row**, not just the auth-specific ones.

## Related

[milestone-5-commerce-rfc.md](milestone-5-commerce-rfc.md) · [33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md) · [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) · [35_INFRASTRUCTURE_AND_DEPLOYMENT.md](35_INFRASTRUCTURE_AND_DEPLOYMENT.md) · [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)
