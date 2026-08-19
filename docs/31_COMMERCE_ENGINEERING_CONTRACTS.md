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

**Implementation note, Sprint 5.2**: it does. `IProductRepository`/`ICategoryRepository`/`IIngredientRepository` all extend `IRepository<TAggregate, Guid>` (`Coffeshop.Domain.Common`) for real, adding only genuinely aggregate-specific methods beyond it (`GetBySkuAsync`, `GetPagedAsync`, `GetFeaturedAsync`, `Remove` on `IProductRepository`; `GetByCodeAsync`/`ExistsByCodeAsync` on both `ICategoryRepository` and `IIngredientRepository`; `GetCategoriesAsync`/`GetCategoryCodesAsync` — the latter two additive mid-sprint, once the admin ingredient editor turned out to need real `IngredientCategory` Guids that nothing previously exposed).

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

**Implementation note, Sprint 5.2**: the real `SearchProductsQuery` is `SearchProductsQuery(string Query, PageRequest Page) : IQuery<PagedResult<ProductSummaryDto>>` — no `CategoryId`/`MinPrice`/`MaxPrice`/`SortBy` filters. Ranked full-text search (`ISearchService`, PostgreSQL `tsvector`/GIN) and structured filtering turned out to be genuinely different concerns once both existed for real: `GetProductsQuery`'s `ProductFilter` (category/season/temperature/availability/status, plus an additive `SearchTerm` for the admin product list's own plain-`ILIKE` name search, which deliberately never routes through `ISearchService` — that ranked path only ever returns `Published`/available products, which would silently hide Draft/Archived rows from an admin search) is the filtering path; `SearchProductsQuery` is the ranking path. Sketching them as one combined query undersold how differently they're actually implemented.

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
| `ProductDto` / `ProductSummaryDto` | `Drink` (`features/menu/types.ts`) | **Implemented, Sprint 5.2, with one real correction from this table's original sketch**: `name`, `category`, `price`, `tagline`, `description`, `tags` match exactly, but `id` is the real database `Guid` (`ProductDto.Id`), *not* `Drink.id` directly — `resolveDrink()`'s callers need `Drink.id` to stay the stable kebab-case string every existing test/store already keys on (`cart-store`, `customizer-store`, `recommendationEngine`), which a Guid can't be. The frontend derives `Drink.id` client-side (`slugify(dto.name)`, verified byte-identical to every one of the 14 real seeded products' original static id) and carries the real Guid separately as `Drink.productId` — additive, optional, `undefined` for `data/drinks.ts`'s own static entries. `ProductSummaryDto` additionally carries `description` despite otherwise being the lean list shape, specifically because `DrinkDetailDialog` needs it for every item the `/menu` grid already renders. |
| `IngredientDto` | `Ingredient` (`features/composer/types.ts`) | **Implemented, Sprint 5.2**: `id`, `name`, `category`, `priceModifier`, `compatibleWith`, `color`, `shape` match exactly — `Ingredient.id`/`category` were already stable string codes on the frontend (unlike `Product`), so no id-mapping trick was needed here the way `ProductDto` needed one. `icon` stays frontend-only, never serialized, exactly as sketched. `sortOrder` is additive beyond the original sketch — `UpdateIngredientCommand` requires it on every call, and nothing exposed the current value until the admin ingredient editor needed to round-trip it without silently resetting it. |
| `OrderDto` / `OrderItemDto` | `OrderDto`/`OrderItemDto` (`lib/order-client.ts`) | **Implemented, Sprint 5.3, with one real correction from this table's original sketch**: this row originally traced against `CompletedOrder`/`CartItem` (`features/cart/types.ts`), the *local, fabricated* order record `cart-store.ts`'s old `placeOrder()` built before a real backend existed. `CompletedOrder` is gone (deleted, not deprecated-in-place — nothing else referenced it) — `cart-store.ts`'s `lastOrder` field now holds the real `OrderDto` the backend actually returns. `OrderItemDto.selection` is the exact JSON shape of `CustomizerSelection` (frontend), verified field-for-field: `color`, `size`, `sleeve`, `lid`, `logo`, `material`, `ingredients: {ingredientId, quantity}[]` — matching this row's own original claim, just against the right frontend type now. |
| `OrderSummaryDto` | `OrderSummaryDto` (`lib/order-client.ts`) | **Implemented, Sprint 5.3, additive**; the lean list shape `GetOrdersQuery`/`GetMyOrdersQuery` return, matching `ProductSummaryDto`'s own "no line items/timeline payload" precedent — a list view never needs the full aggregate. |
| `RecipeSnapshotDto` | `RecipeSnapshot` (`features/cart/types.ts`) | `id`, `createdAt`, `baseDrinkId`, `productId` (additive, Sprint 5.3 — the real backend `Product.Id`, required before a snapshot can become an order line; see `buildRecipeSnapshot.ts`'s own doc comment), `baseDrinkCategory`, `baseDrinkName`, `selection`, `unitPrice`, `appliedRecommendationId` — the frontend's own doc comment ("the whole entire Recipe Snapshot... a complete, self-contained copy") is now literally the wire contract for the fields it sends on, not just a local one. `RecipeSnapshot` itself is never serialized wholesale to the backend — `CreateOrderFromCart`'s request body is built from it (`mapCartToOrderRequest.ts`), not a direct passthrough. |
| `TasteProfileDto` | `TasteProfile` (`features/concierge/types.ts`) | Unchanged — this type never crosses the network in Milestone 5 (the recommendation engine stays client-side, per the RFC); listed here only to confirm no shape drift is introduced by anything adjacent |
| `UserDto` | *(new — no frontend equivalent exists yet)* | **Implemented, Sprint 5.1**: `{ id, email, fullName, isEmailVerified, roles: string[], permissions: string[] }` — `roles`/`permissions` are flattened from the JWT's own claims (matching what the frontend's `auth-store.ts` needs for UI gating), not a nested `RoleDto[]`. `id` is exactly the `UserId` `Order.CustomerId` references, real since Sprint 5.3. |
| `InventoryItemDto` / `InventoryItemSummaryDto` | `InventoryItemDto`/`InventoryItemSummaryDto` (`lib/inventory-client.ts`) | **Implemented, Sprint 5.4, no frontend equivalent existed before this sprint** — `ingredientCode`/`ingredientName` are resolved server-side at query time (a real join against Catalog, never denormalized onto `InventoryItem`), matching `InventoryMappingExtensions`'s own doc comment. `status` is **kebab-case** on the wire (`"low-stock"`/`"out-of-stock"`), a real, deliberate deviation from `OrderStatus`'s plain-lowercase convention — see `InventoryMappingExtensions.ToApiString(InventoryStatus)`'s own doc comment for why (multi-word enum members can't safely use `ToString().ToLowerInvariant()` the way single-word `OrderStatus` members can). |
| `InventoryReservationDto` | `InventoryReservationDto` (`lib/inventory-client.ts`) | **Implemented, Sprint 5.4**: `status` is plain lowercase (`InventoryReservationStatus`'s members are all single words, unlike `InventoryStatus`) — `active`/`consumed`/`released`/`expired`. |
| `InventoryTransactionDto` | `InventoryTransactionDto` (`lib/inventory-client.ts`) | **Implemented, Sprint 5.4**: `reason` is kebab-case (`"order-consumption"`/`"restock"`/`"manual-adjustment"`), same reasoning as `InventoryItemDto.status`. |
| `InventoryDashboardDto` | `InventoryDashboardDto` (`lib/inventory-client.ts`) | **Implemented, Sprint 5.4, additive** — not in this table's original scope; backs the admin dashboard's real grouped counts (`GetInventoryDashboardQuery`, a single grouped SQL query, not three separate paged calls run just to read their `TotalCount`). |

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
| `GET` | `/api/v1/products` | `GetProductsQuery` | Anonymous — **implemented, Sprint 5.2** (admin-facing paged listing, every status, not just Published) |
| `GET` | `/api/v1/products/{id}` | `GetProductQuery` | Anonymous — **implemented, Sprint 5.2** |
| `POST` | `/api/v1/products` | `CreateProductCommand` | `Permission.ManageProducts` — **implemented, Sprint 5.2** |
| `PUT` | `/api/v1/products/{id}` | `UpdateProductCommand` | `Permission.ManageProducts` — **implemented, Sprint 5.2** |
| `PUT` | `/api/v1/products/{id}/pricing` | `UpdatePricingCommand` | `Permission.ManageProducts` — **implemented, Sprint 5.2** |
| `PUT` | `/api/v1/products/{id}/category` | `AssignCategoryCommand` | `Permission.ManageProducts` — **implemented, Sprint 5.2** |
| `PUT` | `/api/v1/products/{id}/availability` | `UpdateAvailabilityCommand` | `Permission.ManageProducts` — **implemented, Sprint 5.2** |
| `PUT` | `/api/v1/products/{id}/featured` | `SetFeaturedCommand` | `Permission.ManageProducts` — **implemented, Sprint 5.2** |
| `POST` | `/api/v1/products/{id}/publish` \| `/archive` \| `/restore` | `PublishProductCommand` \| `ArchiveProductCommand` \| `RestoreProductCommand` | `Permission.ManageProducts` — **implemented, Sprint 5.2**; `Publish`/`Restore` are additive beyond this table's original sketch (a Draft→Published→Archived⇄Draft lifecycle needs explicit transitions the original sketch's plain `ProductDto` CRUD didn't name) |
| `DELETE` | `/api/v1/products/{id}` | `DeleteProductCommand` | `Permission.ManageProducts` — **implemented, Sprint 5.2**; a real hard delete, restricted to still-`Draft` products |
| `POST` \| `DELETE` | `/api/v1/products/{id}/images` \| `/images/{imageId}` | `UploadImageCommand` \| `RemoveImageCommand` | `Permission.ManageProducts` — **implemented, Sprint 5.2**; by URL, not a file upload — no blob/object storage exists in this architecture (see [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md)) |
| `GET` | `/api/v1/menu` | `GetMenuQuery` | Anonymous — **implemented, Sprint 5.2**; Published+available only, unpaginated (matches the frontend's own real "load the whole catalog once" usage) |
| `GET` | `/api/v1/featured` | `GetFeaturedQuery` | Anonymous — **implemented, Sprint 5.2** |
| `GET` | `/api/v1/categories` | `GetCategoriesQuery` | Anonymous — **implemented, Sprint 5.2** |
| `POST` \| `PUT` | `/api/v1/categories` \| `/{id}` | `CreateCategoryCommand` \| `UpdateCategoryCommand` | `Permission.ManageProducts` — **implemented, Sprint 5.2** |
| `GET` | `/api/v1/ingredients` | `GetIngredientsQuery` | Anonymous — **implemented, Sprint 5.2** |
| `POST` \| `PUT` | `/api/v1/ingredients` \| `/{code}` | `CreateIngredientCommand` \| `UpdateIngredientCommand` | `Permission.ManageProducts` — **implemented, Sprint 5.2** |
| `GET` | `/api/v1/ingredient-categories` | `GetIngredientCategoriesQuery` | Anonymous — **implemented, Sprint 5.2, additive**; not in this table's original sketch — `CreateIngredientCommand.IngredientCategoryId` needs a real Guid the admin ingredient editor otherwise had no way to discover |
| `GET` | `/api/v1/search` \| `/search/autocomplete` | `SearchProductsQuery` \| `AutocompleteQuery` | Anonymous — **implemented, Sprint 5.2** |
| `POST` | `/api/v1/carts/{cartId}/items` | `AddCartItemCommand` | *(not built — see [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)'s Sprint 5.3 implementation-status note on why no backend `Cart` aggregate exists; `cart-store.ts` itself is the cart, no `AddCartItemCommand` round trip needed)* |
| `POST` | `/api/v1/orders` | `CreateOrderFromCartCommand` | Anonymous or Authenticated — **implemented, Sprint 5.3**; renamed from this table's original `PlaceOrderCommand` sketch (creates *and* submits the order atomically from the cart in one call — see [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)). Requires a client-generated `IdempotencyKey` (additive — a real double-submission bug this sprint's own adversarial review found and closed). |
| `GET` | `/api/v1/orders/me` | `GetMyOrdersQuery` | Authenticated — **implemented, Sprint 5.3** |
| `GET` | `/api/v1/orders/{id}` | `GetOrderQuery` | Authenticated, ownership-or-staff-permission checked inside the handler (never a distinguishing 403 — a non-owner gets the same 404 a bad id would) — **implemented, Sprint 5.3**; renamed from this table's original `GetOrderByIdQuery` sketch, and the original `?token=` anonymous-access idea was dropped — no real guest-order-lookup UI exists this sprint (a guest's only real record is the confirmation page itself, per `GetMyOrdersQuery`'s own doc comment) |
| `POST` | `/api/v1/orders/{id}/cancel` | `CancelOrderCommand` | Authenticated, same ownership-or-staff check as above — **implemented, Sprint 5.3, additive** |
| `POST` | `/api/v1/orders/{id}/pay` \| `/complete` \| `/fail` | `PayOrderCommand` \| `CompleteOrderCommand` \| `FailOrderCommand` | `Permission.UpdateOrderStatus` (seeded to `Staff` and `Admin`) — **implemented, Sprint 5.3, additive**; "pay" means staff recording that payment was received through some means outside this system (cash, an in-person card reader) — no payment gateway exists this sprint, see [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)'s Payments context |
| `GET` | `/api/v1/admin/orders` \| `/{id}` | `GetOrdersQuery` \| `GetOrderQuery` | `Permission.ViewOrders` (seeded to `Staff` and `Admin`) — **implemented, Sprint 5.3, additive**; the first admin surface this project has built that a `Staff` account (not just `Admin`) can reach |
| `GET` | `/api/v1/admin/inventory` \| `/{id}` | `GetInventoryQuery` \| `GetInventoryItemQuery` | `Permission.ViewInventory` (seeded to `Staff` and `Admin`) — **implemented, Sprint 5.4**; every Inventory route lives under `/admin/inventory`, consolidating this table's original separate bare `/inventory` rows — see `InventoryEndpoints.cs`'s own doc comment for why (no real customer-facing "my inventory" concept exists, unlike `/orders/me`) |
| `GET` | `/api/v1/admin/inventory/dashboard` \| `/low-stock` \| `/out-of-stock` | `GetInventoryDashboardQuery` \| `LowStockReportQuery` \| `OutOfStockProductsQuery` | `Permission.ViewInventory` — **implemented, Sprint 5.4, additive**; the latter two are thin, status-preset callers of the same repository method `GetInventoryQuery` uses, matching `GetOrdersQuery`/`GetMyOrdersQuery`'s own "different query classes, one shared repository method" precedent |
| `GET` | `/api/v1/admin/inventory/history` \| `/reservations` | `InventoryHistoryQuery` \| `InventoryReservationsQuery` | `Permission.ViewInventory` — **implemented, Sprint 5.4** |
| `POST` | `/api/v1/admin/inventory` | `CreateInventoryItemCommand` | `Permission.AdjustInventory` — **implemented, Sprint 5.4, additive**; not named in this table's original sketch, but a real necessity — nothing else can opt an ingredient into stock tracking |
| `POST` | `/api/v1/admin/inventory/{id}/restock` \| `/adjust` \| `/mark-out-of-stock` \| `/mark-available` | `RestockInventoryCommand` \| `AdjustInventoryCommand` \| `MarkOutOfStockCommand` \| `MarkAvailableCommand` | `Permission.AdjustInventory` — **implemented, Sprint 5.4** |
| `PUT` | `/api/v1/admin/inventory/{id}/low-stock-policy` | `UpdateLowStockPolicyCommand` | `Permission.AdjustInventory` — **implemented, Sprint 5.4, additive**; without this, every item would be stuck at `LowStockPolicy.Default`'s threshold of 5 forever |
| `POST` | `/api/v1/admin/inventory/reservations/{id}/expire` | `ExpireReservationCommand` | `Permission.AdjustInventory` — **implemented, Sprint 5.4**; the one reservation-lifecycle command from this table's original sketch (`ReserveInventory`/`ReleaseInventory`/`ConsumeInventory`/`CreateReservation`) that stayed a real public endpoint — see `IInventoryReservationCoordinator`'s own doc comment for why the other four are direct, same-transaction calls from the Order handlers instead, never separate MediatR commands/endpoints |
| `POST` | `/api/v1/payments/create-session` | `CreateCheckoutSessionCommand` | Anonymous (guest checkout has no account), `PaymentPolicy` rate-limited — **implemented, Sprint 5.5**; the real backing for both this table's original sketch's `CreateCheckoutSession` and `StartPayment` — one real command, not two (see that command's own doc comment) |
| `POST` | `/api/v1/payments/{id}/confirm` \| `/cancel` | `ConfirmPaymentCommand` \| `CancelPaymentCommand` | Anonymous, ownership-or-staff-or-guest-order check inside the handler (same pattern as Orders), `PaymentPolicy` rate-limited — **implemented, Sprint 5.5** |
| `POST` | `/api/v1/payments/webhook` | `ProcessPaymentWebhookCommand` | Anonymous, unrate-limited by design (signature verification is the real gate, not request volume) — **implemented, Sprint 5.5** |
| `GET` | `/api/v1/payments/{id}` \| `/{id}/receipt` | `GetPaymentQuery` \| `GetPaymentReceiptQuery` | Anonymous at the route, ownership-or-staff-or-guest-order check inside the handler — **implemented, Sprint 5.5** |
| `GET` | `/api/v1/payments/history` | `ListPaymentsQuery` | Authenticated, `CustomerId` always read from the JWT, never the request — **implemented, Sprint 5.5** |
| `POST` | `/api/v1/payments/{id}/capture` \| `/refund` | `CapturePaymentCommand` \| `RefundPaymentCommand` | `Permission.ProcessRefunds` (already frozen Phase 0, seeded Admin-only, never Staff) — **implemented, Sprint 5.5**; `capture` is real, tested, and genuinely reachable only under `PaymentsOptions.CaptureMode: "Manual"` — see this sprint's own review for the live-found reachability gap this closed |
| `GET` | `/api/v1/admin/payments` | `AdminPaymentSearchQuery` | `Permission.ViewPayments` (additive, Sprint 5.5, seeded to `Staff` and `Admin`) — **implemented, Sprint 5.5** |
| `POST` | `/api/v1/coupons/validate` | `ValidateCouponQuery` | Anonymous |
| `POST` | `/api/v1/reviews` | `SubmitReviewCommand` | Authenticated |
| `PUT` | `/api/v1/favorites/{productId}` | `AddFavoriteCommand` | Authenticated |
| `GET` | `/api/v1/admin/analytics/revenue` | `GetRevenueAnalyticsQuery` | Authenticated + `Permission.ViewAnalytics` |
| `PUT` | `/api/v1/admin/content/{type}/{key}` | `PublishContentCommand` | Authenticated + `Permission.ManageContent` |
| `POST` | `/api/v1/ai-barista/conversations/{id}/turns` | `AppendConversationTurnCommand` | Authenticated (called by the existing Next.js route, server-to-server) |

## Seed data strategy

Every static frontend data file (`features/menu/data/drinks.ts`, `features/composer/data/ingredients.ts`) becomes an EF Core seed migration — the exact same 14 drinks and 9 ingredients, imported once, so Sprint 5.2's Product Platform launches with real, familiar data rather than an empty catalog. **Implemented, Sprint 5.2**: `Coffeshop.Persistence.Seed.CatalogSeeder` — every category/ingredient/product traced verbatim from the frontend's static files (`ProductVariant` price adjustments seeded at real $0.00, matching actual current frontend behavior; `ProductImage` seeded with zero rows, since no real images exist; `NutritionFacts` caffeine values from genuinely well-known typical figures, calories/sugar left `null` rather than fabricated). `features/storytelling/data/chapters.ts` and `features/onboarding/data/steps.ts` seeding the CMS `ContentBlock` table remains a Sprint 5.4+ concern, not yet implemented.

## Related

[milestone-5-commerce-rfc.md](milestone-5-commerce-rfc.md) · [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md) · [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md) · [37_API_STABILITY_POLICY.md](37_API_STABILITY_POLICY.md)
