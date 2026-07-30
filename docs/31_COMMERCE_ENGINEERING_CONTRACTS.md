# 31 — Commerce Engineering Contracts

Phase 0 deliverable — the backend's Sprint 0. No production implementation in this phase. Freezes: repository contracts, CQRS command/query shapes, REST conventions, DTO shapes (traced directly against the frontend's existing types, not re-derived), and a representative endpoint catalog per module.

## Repository contracts

One repository interface per aggregate root (never per entity, never per bounded context) — mirrors [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)'s aggregate list exactly, one-to-one.

```csharp
// Domain layer — no EF Core reference, no "IQueryable leaking out" (a repository
// returns materialized aggregates or nothing, never an IQueryable a caller could
// keep composing against — that would leak the persistence technology through
// the abstraction the whole point of Clean Architecture is to prevent).
public interface IRepository<TAggregate, TId> where TAggregate : AggregateRoot<TId>
{
    Task<TAggregate?> GetByIdAsync(TId id, CancellationToken ct);
    Task AddAsync(TAggregate aggregate, CancellationToken ct);
    void Update(TAggregate aggregate); // EF Core change-tracking handles the actual UPDATE; this just marks intent
    void Remove(TAggregate aggregate); // soft-delete, see "Soft delete" below — never a real DELETE for anything with order/audit relevance
}

// Aggregate-specific repositories extend the generic shape additively —
// never widen the generic interface itself with aggregate-specific methods.
public interface IOrderRepository : IRepository<Order, OrderId>
{
    Task<Order?> GetByAccessTokenAsync(string guestAccessToken, CancellationToken ct); // scenario 2
    Task<IReadOnlyList<Order>> GetByCustomerAsync(UserId customerId, PageRequest page, CancellationToken ct);
}
```

**The rule this enforces**: Application-layer command/query handlers depend only on these interfaces, never on `DbContext` directly. Infrastructure provides the EF Core implementation. This is what makes "swap PostgreSQL for something else" a theoretical possibility without ever needing to exercise it — the same value the frontend's `AIProvider` interface (Sprint 3.9) already proved on a smaller scale.

**Implementation note, Sprint 5.1**: `IUserRepository`/`IRoleRepository` were built as standalone interfaces, not `: IRepository<User, Guid>`/`: IRepository<RoleDefinition, Guid>` extending a shared generic base. `User`'s real query needs (`GetByEmailAsync`, three separate token-hash lookups) don't share a base shape worth factoring out, and a two-aggregate Identity context didn't earn the extra indirection a generic base adds. The pattern above (repository-per-aggregate, additive aggregate-specific methods) is still followed exactly — only the literal generic-interface inheritance is deferred until a third+ aggregate (Sprint 5.2's `Product`/`Ingredient`/`Category`) shows whether the shared shape actually holds.

## CQRS shapes

```csharp
// Every command is a MediatR IRequest<TResult>, one per business operation —
// never a generic "UpdateOrder(patch)"-style command that hides which fields
// actually changed and why (that's the API Stability Policy's problem too:
// a generic patch command's contract never stabilizes, since "what fields
// exist" changes with every entity, defeating the whole point of freezing it).
public record PlaceOrderCommand(
    Guid CartId,
    string? CouponCode,
    DeliveryAddressDto? DeliveryAddress,
    GuestContactInfoDto? GuestContact // null when authenticated — UserId comes from the auth context, never a request body field
) : IRequest<OrderDto>;

// One validator per command, run as a MediatR pipeline behavior — never
// inline validation inside the handler itself.
public class PlaceOrderCommandValidator : AbstractValidator<PlaceOrderCommand>
{
    public PlaceOrderCommandValidator()
    {
        RuleFor(x => x.CartId).NotEmpty();
        RuleFor(x => x.CouponCode).MaximumLength(32).When(x => x.CouponCode is not null);
        // FluentValidation validates SHAPE — "is this a well-formed request."
        // It never validates DOMAIN INVARIANTS ("is this coupon still valid,
        // is this cart non-empty") — those live in the aggregate/domain
        // service, checked when the command handler actually executes,
        // because they depend on database state a validator shouldn't
        // reach into.
    }
}

// Queries are the read-side sibling — same IRequest<T> shape, but a query
// handler may read through a repository OR a direct, read-optimized query
// (Dapper/raw SQL/a cached projection) — the CQRS split's whole point is
// that read-side performance work never touches write-side domain code.
public record SearchProductsQuery(
    string? SearchTerm,
    Guid? CategoryId,
    decimal? MinPrice,
    decimal? MaxPrice,
    string? SortBy,
    PageRequest Page
) : IRequest<PagedResult<ProductSummaryDto>>;
```

## REST API conventions — frozen, apply to every endpoint

| Concern | Convention |
|---|---|
| Versioning | URL-segment versioning, `/api/v1/...`. A breaking change never mutates `v1` — it ships as `/api/v2/...` alongside the still-live `v1`, per [37_API_STABILITY_POLICY.md](37_API_STABILITY_POLICY.md). |
| Pagination | `?page=1&pageSize=20` (1-indexed, `pageSize` capped server-side at 100). Every list response is a `PagedResult<T>` envelope: `{ items: T[], page, pageSize, totalCount, totalPages }` — one shape, every list endpoint, never a bare array (a bare array can never grow pagination metadata without breaking every existing caller — decided once, here, not per-endpoint). |
| Filtering | Query-string parameters, named after the DTO field they filter (`categoryId`, `minPrice`) — never a generic `?filter=` query-language string for v1 (a real future need, deferred honestly rather than half-designed now). |
| Sorting | `?sortBy=price&sortDir=asc` — an allow-listed set of sortable fields per endpoint (documented per-endpoint in OpenAPI), never an arbitrary raw column name (a SQL-injection-shaped footgun even with parameterization done right, and a contract-stability footgun regardless — exposing raw column names couples the API to the schema). |
| Errors | [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) exclusively — `{ type, title, status, detail, instance, errors? }` (the last for validation errors, field-keyed). One shape for every 4xx/5xx, never a bespoke per-endpoint error body. |
| Idempotency | Every state-changing endpoint that could plausibly be retried after an ambiguous network failure (`PlaceOrder`, `CapturePayment`) accepts an `Idempotency-Key` header; the server persists `(key, response)` for 24h and replays the stored response on a duplicate key rather than re-executing — the concrete mechanism scenario 4/[29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) depends on. |
| Concurrency | `ETag` (a hash of the resource's `RowVersion`/`xmin`) on every `GET` for a mutable resource; a `PUT`/`PATCH` requires `If-Match` — a stale-write conflict is a real `412 Precondition Failed`, never a silent last-write-wins. Backs [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)'s optimistic-concurrency invariants (e.g. `InventoryItem.StockQuantity`). |
| Auth | `Authorization: Bearer <JWT>`. Every endpoint is `[Authorize]` by default at the policy level (see [33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md)); anonymous-allowed endpoints (catalog browse, guest checkout) are explicitly `[AllowAnonymous]`, a deliberate opt-out, never the default. |
| OpenAPI | Every endpoint documented via Swashbuckle/OpenAPI annotations — the contract a frontend TanStack Query hook is generated against (or hand-written to match), and the artifact [37_API_STABILITY_POLICY.md](37_API_STABILITY_POLICY.md)'s diff-based compatibility check runs against in CI. |

## DTO shapes — traced against the existing frontend types, not re-derived

The single most important consistency check in this whole document set: every DTO below is checked against the *actual, shipped* frontend type it will replace the mock/local equivalent of.

| Backend DTO | Frontend type it targets | Verified against |
|---|---|---|
| `ProductDto` | `Drink` (`features/menu/types.ts`) | `id`, `name`, `category`, `price`, `tagline`, `description`, `tags` — every field name matches exactly, so `resolveDrink()`'s callers need zero shape changes, only a data-source swap |
| `IngredientDto` | `Ingredient` (`features/composer/types.ts`) | `id`, `name`, `category`, `priceModifier`, `compatibleWith`, `color`, `shape` — `icon` (a Lucide component reference) stays frontend-only, never serialized; the DTO omits it, the frontend maps `id` → icon via its own existing lookup, unchanged |
| `OrderDto` / `OrderLineDto` | `CompletedOrder` / `CartItem` (`features/cart/types.ts`) | `RecipeSelection` (backend) is the exact JSON shape of `CustomizerSelection` (frontend) — verified field-for-field: `color`, `size`, `sleeve`, `lid`, `logo`, `material`, `ingredients: {ingredientId, quantity}[]` |
| `RecipeSnapshotDto` | `RecipeSnapshot` (`features/cart/types.ts`) | `id`, `createdAt`, `baseDrinkId`, `baseDrinkCategory`, `baseDrinkName`, `selection`, `unitPrice`, `appliedRecommendationId` — identical field set; the frontend's own doc comment ("the whole entire Recipe Snapshot... a complete, self-contained copy") is now literally the wire contract, not just a local one |
| `TasteProfileDto` | `TasteProfile` (`features/concierge/types.ts`) | Unchanged — this type never crosses the network in Milestone 5 (the recommendation engine stays client-side, per the RFC); listed here only to confirm no shape drift is introduced by anything adjacent |
| `UserDto` | *(new — no frontend equivalent exists yet)* | **Implemented, Sprint 5.1**: `{ id, email, fullName, isEmailVerified, roles: string[], permissions: string[] }` — `roles`/`permissions` are flattened from the JWT's own claims (matching what the frontend's `auth-store.ts` needs for UI gating), not a nested `RoleDto[]`. `id` is exactly the `UserId` an `Order`/`RecipeSnapshot` would reference once Sprint 5.3 builds `Order`. |

**The rule this table enforces**: no DTO ships with a field the frontend doesn't already have a place to put, and no existing frontend type needs a shape change to consume its backend counterpart. Where the two genuinely differ (icons, client-only derived values), the difference is named explicitly, not silently assumed compatible.

## Representative endpoint catalog

Not exhaustive (the full surface is the Swagger/OpenAPI document, generated from code, once code exists) — one representative row per module, enough to validate the conventions above against real shapes.

| Method | Path | Command/Query | Auth |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | `RegisterUserCommand` | Anonymous — **implemented, Sprint 5.1** |
| `POST` | `/api/v1/auth/login` | `LoginCommand` | Anonymous — **implemented, Sprint 5.1** |
| `POST` | `/api/v1/auth/refresh` | `RefreshTokenCommand` | Anonymous (refresh cookie, not access token) — **implemented, Sprint 5.1** |
| `POST` | `/api/v1/auth/logout` | `LogoutCommand` | Anonymous (cookie identifies the session) — **implemented, Sprint 5.1** |
| `GET` | `/api/v1/auth/me` | `GetCurrentUserQuery` | Authenticated — **implemented, Sprint 5.1**, additive beyond this table's original sketch |
| `POST` | `/api/v1/auth/verify-email` | `VerifyEmailCommand` | Anonymous — **implemented, Sprint 5.1**, additive |
| `POST` | `/api/v1/auth/forgot-password` | `ForgotPasswordCommand` | Anonymous — **implemented, Sprint 5.1**, additive |
| `POST` | `/api/v1/auth/reset-password` | `ResetPasswordCommand` | Anonymous — **implemented, Sprint 5.1**, additive |
| `GET` | `/api/v1/auth/sessions` | `GetSessionsQuery` | Authenticated — **implemented, Sprint 5.1**, additive |
| `POST` | `/api/v1/auth/revoke-session` | `RevokeSessionCommand` | Authenticated — **implemented, Sprint 5.1**, additive |
| `GET` | `/api/v1/products` | `SearchProductsQuery` | Anonymous |
| `GET` | `/api/v1/products/{id}` | `GetProductByIdQuery` | Anonymous |
| `GET` | `/api/v1/ingredients` | `GetIngredientsQuery` | Anonymous |
| `POST` | `/api/v1/carts/{cartId}/items` | `AddCartItemCommand` | Anonymous or Authenticated (cart id is a bearer-of-its-own-identity for anonymous carts — see [33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md)'s guest-session note) |
| `POST` | `/api/v1/orders` | `PlaceOrderCommand` | Anonymous or Authenticated |
| `GET` | `/api/v1/orders/me` | `GetMyOrdersQuery` | Authenticated |
| `GET` | `/api/v1/orders/{id}` | `GetOrderByIdQuery` | Authenticated, or Anonymous with `?token=` |
| `POST` | `/api/v1/coupons/validate` | `ValidateCouponQuery` | Anonymous |
| `POST` | `/api/v1/reviews` | `SubmitReviewCommand` | Authenticated |
| `PUT` | `/api/v1/favorites/{productId}` | `AddFavoriteCommand` | Authenticated |
| `GET` | `/api/v1/admin/analytics/revenue` | `GetRevenueAnalyticsQuery` | Authenticated + `Permission.ViewAnalytics` |
| `PUT` | `/api/v1/admin/content/{type}/{key}` | `PublishContentCommand` | Authenticated + `Permission.ManageContent` |
| `POST` | `/api/v1/ai-barista/conversations/{id}/turns` | `AppendConversationTurnCommand` | Authenticated (called by the existing Next.js route, server-to-server) |

## Seed data strategy

Every static frontend data file (`features/menu/data/drinks.ts`, `features/composer/data/ingredients.ts`) becomes an EF Core seed migration — the exact same 14 drinks and 9 ingredients, imported once, so Sprint 5.2's Product Platform launches with real, familiar data rather than an empty catalog. `features/storytelling/data/chapters.ts` and `features/onboarding/data/steps.ts` seed the CMS `ContentBlock` table the same way — the frontend's existing hardcoded copy becomes the *initial* CMS content, editable from there forward, never re-typed from scratch.

## Related

[milestone-5-commerce-rfc.md](milestone-5-commerce-rfc.md) · [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md) · [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md) · [37_API_STABILITY_POLICY.md](37_API_STABILITY_POLICY.md)
