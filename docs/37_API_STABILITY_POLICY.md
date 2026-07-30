# 37 — API Stability Policy

Proposed directly by the user during the Milestone 5 brief, alongside [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md): *"Any API, DTO, or contract adopted in Milestone 5 must not be broken in any subsequent milestone. Any new development should be handled by adding a new version or extension contracts, rather than modifying the existing API."* This document is that rule, made concrete and enforceable — the backend's counterpart to the frontend's Zero Rewrite Policy, governing the new frontend↔backend boundary those two systems now share.

## The rule

An API contract — an endpoint's URL/verb/request shape/response shape, a DTO's field set, a Problem Details error code, an event payload in [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md) — that ships in Milestone 5 is **frozen** the moment it ships: it does not change in a way that breaks an existing, deployed consumer, ever, in any later milestone. Future capability extends a frozen contract; it does not modify it in place.

This exists because the two sides of this boundary deploy independently and can't be assumed to update in lockstep — the frontend Next.js app and the ASP.NET Core backend are two separate deployables the moment Sprint 5.1 ships, and a breaking change on one side with no coordinated release on the other is a production outage, not a code-review nit.

## The permitted extension mechanisms, in order of preference

Mirroring [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md)'s own structure, deliberately — the two policies should feel like one discipline applied to two layers, not two unrelated rulebooks:

1. **Additive DTO fields** — a new optional/nullable field on an existing response DTO. An existing frontend consumer that doesn't know about the field ignores it; nothing breaks. This is the overwhelming majority of real growth (adding `Product.AverageRating` once reviews exist doesn't touch `ProductDto`'s existing fields).
2. **New endpoints** — a new capability is a new route, not a repurposed existing one. `POST /v1/orders/{id}/refund` is a new endpoint the day refunds ship; it is never bolted onto `PATCH /v1/orders/{id}` as an overloaded status transition.
3. **New query parameters** — additive, optional, defaulted to preserve existing behavior when absent. Adding `?sortBy=` to `GET /v1/products` never changes the default ordering existing callers already depend on.
4. **Extension contracts** — a genuinely new concern gets its own DTO/endpoint family rather than widening an existing one to carry unrelated data. The `ConversationHistory` aggregate ([30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)) is the worked example: AI Barista conversation persistence is a new, small, separate contract, never fields grafted onto `OrderDto` or `UserDto` because they happened to be the nearest existing shape.
5. **A new API version** — when a change genuinely cannot be additive (a field's *meaning* needs to change, a response shape needs restructuring), it ships as `/api/v2/{resource}` alongside the untouched `/api/v1/{resource}` — never as an in-place edit to `v1`. `v1` keeps working, unmodified, for exactly as long as any real consumer depends on it; it is deprecated (announced, dated, monitored for zero traffic) before removal, never silently dropped.

If none of the first four apply, a new version (mechanism 5) is the fallback — not a signal to reach for mechanism 5 casually. Most of what feels like "this needs to change" turns out to be mechanism 1 or 2 once actually worked through, exactly as [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) found for the frontend's own five mechanisms.

## What counts as "breaking" — the concrete test

Same test as the frontend policy, restated for wire contracts: **does any existing, unmodified consumer's behavior change?**

- Adding `Product.Tags: string[]` to `ProductDto` — existing frontend code that destructures `{ id, name, price }` from the response is unaffected. **Extension.**
- Renaming `ProductDto.Price` to `ProductDto.UnitPrice`, or changing `Price` from a `number` to a `{ amount, currency }` object — every existing caller's `product.price` access silently returns `undefined` or the wrong shape. **Breaking.** Requires mechanism 5.
- Adding a new required field to a request DTO (e.g. `PlaceOrderCommand` gaining a mandatory `deliveryWindow`) — every existing client that doesn't send it now gets a 400 it didn't get before. **Breaking**, even though nothing about the *response* shape changed — request-side additions must be optional with a sensible default, or they're mechanism 5, not mechanism 1.
- Changing an enum's existing member's meaning (`OrderStatus.Cancelled` starting to also cover what was previously a distinct `Refunded`) — an existing frontend `switch` over `OrderStatus` silently mishandles a case it used to handle correctly. **Breaking**, even though the wire type (`string`) didn't change — this is why [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)'s `OrderStatus` state machine is treated as frozen the same way a DTO shape is, not just documentation.

## What "contract" means concretely, for this backend

- Every endpoint's route, HTTP verb, and success/error status codes
- Every request/response DTO's field set, per-field type, and nullability
- Every RFC 9457 Problem Details `type`/`title` value a client might branch on
- `PagedResult<T>`'s envelope shape ([31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md))
- Every domain event's payload shape in [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md) that crosses the SignalR boundary to the frontend (internal-only events that never leave the backend process are governed by ordinary code-review, not this policy — they have no external consumer to break)
- JWT claim names/shapes ([33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md)) — the frontend's `auth-store.ts` decodes these directly

## Versioning mechanics

`/api/v1/` is the URL segment for everything Sprint 5.1-5.6 ships. A `v2` segment is created only when mechanism 5 is actually invoked — not provisioned speculatively now, which would be exactly the "config system for features that don't exist yet" [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) already rules out for the frontend. Both versions, when a `v2` exists, are live simultaneously behind the same ASP.NET Core host (route-prefix-based, via Asp.Versioning or an equivalent convention — not separate deployments), so a `v1` consumer and a `v2` consumer are served by the same running application without either one's traffic affecting the other's contract.

## Relationship to Zero Rewrite Policy

Two policies, one discipline, applied at the two layers this boundary now has:

| | Governs | Extension mechanism when a change is needed |
|---|---|---|
| [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) | Frontend manager/store public contracts | Registry, composition, adapters, DI, additive interface extension |
| This document | Backend API/DTO/event contracts | Additive fields, new endpoints, new query params, extension contracts, new API version |

Together they mean a frontend store's `placeOrder()` action signature and the wire contract it calls (`POST /v1/orders`) are **both** frozen the moment they first ship for real — Milestone 5 is the only milestone in this project's history where both halves of an integration freeze at the same time, since it's the first milestone where a real network boundary exists at all.

## Enforcement

Every future milestone's Architecture Freeze document performs the same cross-check [26_API_STABILITY.md](26_API_STABILITY.md) already performs for frontend interfaces: every endpoint/DTO a new sprint plans to consume is checked against this policy's frozen set, and any genuinely necessary breaking change is called out explicitly, in writing, with mechanism 5 (a new version) as its resolution — never a silent in-place edit discovered later by a failing frontend build.

**Compliance record, Sprint 5.2**: zero Sprint 5.1 contracts touched — every Catalog endpoint/DTO/query-param is new surface, not a modification of anything Identity already shipped. Real usage of the extension mechanisms above, not just the theory: `ProductFilter.SearchTerm` (mechanism 3, an additive optional query param, added mid-sprint once the admin product list turned out to need name search); `GET /api/v1/ingredient-categories` (mechanism 2, a new endpoint, added mid-sprint once `CreateIngredientCommand.IngredientCategoryId` turned out to be otherwise undiscoverable); `ProductSummaryDto.Description` and `IngredientDto.SortOrder` (mechanism 1, additive fields, added once real frontend/admin consumers needed values the original DTO sketch hadn't included). No mechanism 5 (new API version) was needed this sprint.

## Related

[17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) · [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md) · [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md) · [26_API_STABILITY.md](26_API_STABILITY.md) · [milestone-5-commerce-rfc.md](milestone-5-commerce-rfc.md)
