# ADR-0012 — Short-lived JWT access tokens + rotating, single-use refresh tokens

**Status**: Accepted

## Context

The frontend needs a real authentication mechanism for the first time ([33_AUTH_ARCHITECTURE.md](../33_AUTH_ARCHITECTURE.md)), and the two conventional alternatives both have real, known weaknesses: server-side session cookies alone don't scale cleanly across the horizontally-scaled, stateless API replicas [35_INFRASTRUCTURE_AND_DEPLOYMENT.md](../35_INFRASTRUCTURE_AND_DEPLOYMENT.md) already commits to (every request would need a session-store round trip); a single long-lived JWT stored in `localStorage` is vulnerable to XSS exfiltration with no way to detect or bound a theft, and — being self-contained — can't be revoked before its own expiry without a server-side denylist that reintroduces the statefulness the JWT was meant to avoid.

## Decision

Two tokens with different lifetimes and different theft-resistance properties: a 15-minute JWT access token, held in memory only on the frontend, carrying claims (`sub`/`roles`/`permissions`) so most requests need zero database round trip for authorization; and a 30-day refresh token, opaque, stored in an `HttpOnly`/`Secure`/`SameSite=Strict` cookie (unreadable by JavaScript, closing the XSS path for the long-lived credential), rotating on every use (single-use — redeeming one immediately revokes it and issues a new one), with reuse-detection (a revoked token redeemed again triggers a full revoke-all for that user) as the security response to a detected theft.

## Consequences

Gains: the access token's statelessness keeps the common case (most API requests) fast and horizontally scalable with zero session-store dependency; the refresh token's `HttpOnly` cookie closes the single biggest realistic theft vector (XSS) for the credential that actually matters long-term; rotation turns "a refresh token was stolen" from an undetectable, 30-day-standing risk into a bounded, detected-and-revoked one. Costs, named honestly: a stolen access token remains valid for up to 15 minutes with no revocation mechanism — an accepted residual risk bounded by the short lifetime, not eliminated ([36_SECURITY_MODEL.md](../36_SECURITY_MODEL.md)); rotation requires the reuse-detection race condition (a legitimate retried request racing its own rotation) to be genuinely correct, an implementation risk named explicitly and not yet verified (C-09, [38_COMMERCE_RISK_REGISTER.md](../38_COMMERCE_RISK_REGISTER.md)).
