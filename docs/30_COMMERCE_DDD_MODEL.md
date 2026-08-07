# 30 — Commerce DDD Model

Phase 0 deliverable. Every bounded context's aggregates, entities, value objects, invariants, and domain events, frozen before Sprint 5.1 begins — the backend's equivalent of [22_MANAGER_INTERFACES.md](22_MANAGER_INTERFACES.md). An **aggregate root** is the only entity a repository loads/saves directly; everything inside it is reached only through it, and every invariant that must hold *within* the aggregate is enforced by its own methods, never by a caller reaching in and setting a field.

## Convention, stated once

- **Entity**: has identity (a `Guid` id) and a lifecycle; equality is by id.
- **Value Object**: no identity; equality is by value; immutable (a `record` in C#, not a mutable class). `Money`, `Address`, `Email` — never entities, never given an id just because "it might need one later" (that's speculative abstraction, the same rule [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md) already forbids on the frontend).
- **Aggregate root**: the entity a repository is defined against. Cross-aggregate references are always by id (`CustomerId`, never a navigation property to the actual `Customer` aggregate) — this is the mechanical rule that keeps aggregates independently loadable and prevents the "load the whole graph" anti-pattern EF Core makes easy to fall into by accident.
- **Domain event**: something that happened, named in the past tense, raised by an aggregate method and dispatched *after* the transaction that produced it commits (never before — a rolled-back transaction must never have raised an event nobody undoes). Full catalog: [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md).

## Bounded context: Identity & Access

| | |
|---|---|
| Aggregate root | `User` |
| Entities (inside the aggregate) | `RefreshToken` (a `User` may hold several, one per active device/session) |
| Value objects | `Email` (validated format, normalized lowercase), `HashedPassword` (never a plain string — the type itself only constructible via the hashing service), `FullName` |
| Invariants | An `Email` is unique across all `User`s (enforced by a unique index, not just application logic — see [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md)'s concurrency notes). A `RefreshToken` is single-use — redeeming one revokes it and issues a new one in the same operation (rotation), closing the replay window a static long-lived refresh token would leave open. A `User` cannot authenticate until `EmailVerified` is true, *except* the flows that don't require it (guest checkout never touches this aggregate at all). |
| Roles/Permissions | `Role` and `Permission` are a **separate, small aggregate** (`RoleDefinition`), not entities inside `User` — a permission model that changes (a new permission added to a role) must never require loading and re-saving every user who holds that role. `User` holds only `RoleId`s (a value object list), resolved against `RoleDefinition` at authorization time. See [33_AUTH_ARCHITECTURE.md](33_AUTH_ARCHITECTURE.md). |
| Domain events | `UserRegistered`, `EmailVerified`, `PasswordResetRequested`, `PasswordChanged`, `UserLoggedIn` (a security event, not just telemetry — see [36_SECURITY_MODEL.md](36_SECURITY_MODEL.md)), `RefreshTokenRevoked` |

## Bounded context: Catalog

*Implemented, Sprint 5.2 — the table below describes the real, shipped model, not the pre-implementation sketch it replaces (see [docs/reviews/sprint-5.2-review.md](reviews/sprint-5.2-review.md) for what changed and why).*

| | |
|---|---|
| Aggregate roots | `Product`, `Ingredient`, `Category` — three separate aggregates, not one "Catalog" god-aggregate, exactly as sketched. A `Product` references `CategoryId` by id, never by embedding the full `Category` — a category rename never requires touching every product row in the same transaction. `IRepository<TAggregate, TId>` (`Coffeshop.Domain.Common`) — deferred at Sprint 5.1 as not yet earning its indirection for a two-aggregate context — is implemented for real here, with these three aggregates validating the shared shape. |
| Entities | `ProductVariant` and `ProductImage` (both inside `Product` — e.g. size/price-delta and gallery images; neither has an independent lifecycle outside its parent). `IngredientCategory` — a lightweight reference entity, not a full aggregate root with its own repository (mirrors `Permission`'s role in the Identity context) — kept distinct from `Ingredient` so a future second ingredient under the same category (e.g. a second syrup flavor) is additive, never a new category. |
| Value objects | `Money` (`decimal Amount` + `Currency`, arithmetic operators defined once), `Price` (a `Money` plus an optional `CompareAtAmount` for "was/now" display), `Sku`, `ProductTag`, `NutritionFacts` (all-nullable — no fabricated calorie/sugar data for products where it was never real to begin with). |
| Invariants | A `Product`'s price is always > 0 (`Price.Create` throws `InvalidPriceException` otherwise). Status is a real three-state lifecycle (`ProductStatus.Draft → Published ⇄ Archived`), not the originally-sketched boolean `IsActive` flag — `Archive()`/`Restore()`/`Publish()` enforce the legal transitions, and an `Archived` product rejects every other mutation (`ProductArchivedException`) until restored. A hard delete (`PrepareForDeletion`) is restricted to still-`Draft` products only — nothing else could plausibly reference a product that was never published. An `Ingredient`'s `CompatibleCategoryCodes`/`IsUniversallyCompatible` pair mirrors `features/composer/data/ingredients.ts`'s existing `compatibleWith` field exactly — the frontend's compatibility rules were already correct; this migration copied the *data*, not the *rule*, into real rows. |
| Domain events | `ProductCreated`, `ProductUpdated`, `ProductPriceChanged`, `ProductPublished`, `ProductArchived`, `ProductRestored`, `ProductDeleted`, `IngredientCreated`, `IngredientUpdated`, `CategoryCreated`, `CategoryUpdated` — the originally-sketched `ProductDiscontinued` became `ProductArchived`/`ProductRestored` (a reversible pair, not a one-way discontinuation) once real usage needed restoration; full detail in [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md). |

## Bounded context: Inventory

| | |
|---|---|
| Aggregate root | `InventoryItem` (one per `Ingredient`, or per `Product` for non-composable items — a coffee shop's real constraint is usually ingredient-level, not finished-drink-level, since a "Latte" and a "Cappuccino" both consume the same milk) |
| Value objects | `StockQuantity` (never negative — a domain invariant, not just a UI clamp), `ReorderThreshold` |
| Invariants | `StockQuantity` cannot go negative; a debit that would make it negative is rejected by the aggregate method itself (`Debit(quantity)` throws a domain exception), not caught by a caller checking first — preventing the classic check-then-act race under concurrent orders (see [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md)'s optimistic-concurrency note). |
| Domain events | `StockDebited`, `StockReplenished`, `LowStockThresholdCrossed` (drives a notification, see [34_PAYMENTS_NOTIFICATIONS_SEARCH.md](34_PAYMENTS_NOTIFICATIONS_SEARCH.md)) |
| A deliberate scope decision | Inventory tracks *ingredients*, not a literal 1:1 mirror of every `ProductVariant`. Composing a "what does completing this order consume" projection is an `Order`-side responsibility (reads `OrderLine.Selection`, the same `CustomizerSelection`-shaped JSON the frontend already produces) — Inventory itself stays a flat, simple ledger per stocked item, not a second copy of the product composition model. See [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) scenario 4. |

**Implementation status, Sprint 5.4.** The sketch above is this bounded context's original Phase 0 design, kept as-written per this doc's own frozen-record convention — real implementation deviated from it in several deliberate, reasoned ways:

- **`InventoryItem`/`InventoryReservation` are both real `AggregateRoot`s; `InventoryTransaction` is a plain `Entity`.** The sketch named one aggregate root; real usage needed a second one for reservations, since a reservation has its own independent lifecycle (`Consume`/`Release`/`Expire`, each individually invocable — e.g. a standalone admin "expire this stuck hold" action) that the domain-events/outbox machinery only gives real aggregates. `InventoryTransaction` (the ledger row) never has independent behavior after creation, so it stays a plain `Entity`, not a third aggregate.
- **No Redis-backed reservation.** [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) scenario 1 originally sketched a Redis TTL hold for reservations ("not a domain aggregate"). Real implementation made `InventoryReservation` a durable Postgres-backed aggregate instead — a `grep` across the whole backend during this sprint's own Phase 0 audit confirmed Redis (provisioned in `docker-compose.yml` since Sprint 5.0) has never been consumed by any real backend code; building the *first* Redis integration in this project for one feature, when the brief itself wants a queryable admin "Reservation viewer" with real history, was a worse trade than a real table with a real `ExpiresAtUtc` column. Reservations expire *lazily* (reclaimed the moment another request needs that same ingredient's stock — see `IInventoryReservationCoordinator`'s own doc comment) rather than via a background sweep — this project has no `BackgroundService`/Hangfire-style worker anywhere yet, and introducing the first one just for this would have been a bigger architectural addition than the brief asked for. A real, narrow admin `ExpireReservationCommand` covers the "staff manually clears a stuck hold" case the lazy sweep alone doesn't reach until something else asks for that ingredient.
- **`StockQuantity`/`ReorderThreshold` shipped as `StockLevel`/`LowStockPolicy`**, plus an additive `Quantity` VO (a positive, non-zero amount being moved — distinct from `StockLevel`, which can be zero but never negative). `ReservedQuantity` (also a `StockLevel`) is a maintained running total on `InventoryItem`, not resummed from reservation rows on every read — the same "aggregate-owned invariant" reasoning `Order.Totals` already established.
- **The real domain events** are `InventoryItemCreatedEvent`, `InventoryReservationCreatedEvent`/`InventoryReservedEvent`, `InventoryReservationFailedEvent`, `InventoryConsumedEvent`, `InventoryReleasedEvent`, `InventoryReservationExpiredEvent`, `InventoryRestockedEvent`, `InventoryAdjustedEvent`, `InventoryLowStockEvent`, `InventoryOutOfStockEvent`, `InventoryBackInStockEvent` — see [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md)'s own row-by-row reconciliation against the sketch's original `StockDebited`/`StockReplenished`/`LowStockThresholdCrossed` names, and its own note on why Inventory does **not** consume `OrderSubmitted`/`OrderPaid`/etc. through the outbox despite this sketch implying it would.
- **Reservation and consumption are separate real operations**, per this sprint's own brief ("Consumption occurs only after successful payment, not before"): `Reserve` holds stock without moving the on-hand balance; `Consume` (called only from `PayOrderCommandHandler`) moves it. `Adjust`/`Restock`/`MarkOutOfStock`/`MarkAvailable` are real, additive staff-facing operations the original sketch's two-event list didn't name.

## Bounded context: Ordering

| | |
|---|---|
| Aggregate roots | `Cart`, `Order` — deliberately **separate aggregates**, not one with a status flag. A `Cart` is mutable, ephemeral, cheap to abandon; an `Order` is immutable-once-placed except for its own lifecycle transitions. Converting a `Cart` to an `Order` is an explicit application-service operation (`PlaceOrderCommand`), not a state transition inside one aggregate — this is the single most important boundary decision in this whole model, stress-tested in [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) scenario 1. |
| Entities | `CartLine` / `OrderLine` (inside their respective roots) |
| Value objects | `RecipeSelection` (a direct, intentional mirror of the frontend's existing `CustomizerSelection` shape — see [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md), stored as JSONB, not decomposed into relational columns — it has no query requirements of its own beyond "redisplay exactly what was ordered," the same reasoning `RecipeSnapshot` already applies client-side), `OrderStatus` (a closed enum, not a free string — see the state machine below), `DeliveryAddress`, `GuestContactInfo` (email only, for the order-confirmation notification — present when `CustomerId` is null, see the Guest checkout row below) |
| Invariants | An `Order`'s status only moves forward through its defined transitions (below) — never backward, never skips a step except the two explicitly-modeled exceptions (`Cancelled`, `Refunded`, both reachable from multiple prior states). An `Order`'s line items and total are immutable once `Paid` — a price change to the underlying `Product` after that point never retroactively changes an already-placed order, mirroring the frontend's own `RecipeSnapshot` denormalization. A `Cart` cannot be converted to an `Order` if it's empty. An `Order` carries exactly one identity path — a non-null `CustomerId` (authenticated) or a non-null `GuestContactInfo` (guest), never both null and never both populated — enforced in the aggregate's own construction, not left to callers ([29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) scenario 2). |
| Order status state machine | `Pending → Paid → Preparing → Ready → Completed`, with `Cancelled` reachable from `Pending`/`Paid` and `Refunded` reachable from `Paid`/`Preparing`/`Ready`/`Completed` — matching the brief's own named states exactly |
| Domain events | `CartItemAdded`, `CartItemRemoved`, `OrderPlaced`, `OrderPaid`, `OrderPreparing`, `OrderReady`, `OrderCompleted`, `OrderCancelled`, `OrderRefunded` |

```mermaid
stateDiagram-v2
    [*] --> Pending: PlaceOrderCommand
    Pending --> Paid: PaymentCaptured
    Pending --> Cancelled: CancelOrderCommand
    Paid --> Preparing: StartPreparingCommand
    Paid --> Cancelled: CancelOrderCommand (pre-preparation window only)
    Paid --> Refunded: RefundCommand
    Preparing --> Ready: MarkReadyCommand
    Preparing --> Refunded: RefundCommand
    Ready --> Completed: MarkCompletedCommand
    Ready --> Refunded: RefundCommand
    Completed --> Refunded: RefundCommand
    Cancelled --> [*]
    Refunded --> [*]
    Completed --> [*]
```

**Implementation status, Sprint 5.3.** The sketch above is this bounded context's original Phase 0 design, kept as-written per this doc's own frozen-record convention (Sprint 5.2's Catalog section above got the same treatment) — real implementation deviated from it in several deliberate, reasoned ways, each with a real cause, none speculative:

- **No `Cart` aggregate was built.** This sprint's real brief had no `Cart` in its own domain-model list at all, because the frontend's `stores/cart-store.ts` (real, `localStorage`-backed, shipped since Sprint 3.6) already *is* the cart — "Connect frontend Cart with backend" (the brief's own Phase 5 heading) meant submitting that existing cart directly via a single `CreateOrderFromCart` command, not building a second, server-side mirror of it purely to satisfy this sketch's original two-aggregate shape. `CartItemAdded`/`CartItemRemoved` (the domain events row above) are correspondingly unbuilt — see [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md)'s own note on those two rows.
- **The real state machine is `Draft → Submitted → Paid → Completed`**, with `Cancelled` reachable from `Draft`/`Submitted`/`Paid` and `Failed` reachable from `Submitted` only — narrower than the sketch above. No `Preparing`/`Ready` status exists: the brief's own method list never named `StartPreparing`/`MarkReady`, and finer-grained real-world progress between "paid" and "picked up" is recorded as a free-text note on a real, append-only `OrderTimelineEntry` list rather than invented formal states with nothing to trigger them. No `Refunded` status exists either — no `Payment` aggregate was built this sprint (see below), so there is nothing real to reverse a capture against; `Cancel` covers "this order won't be fulfilled," which is the real capability that exists.
- **`OrderNumber`** (not in the original value-object list) is a real, additive value object backed by a genuine Postgres `SEQUENCE` (`order_number_seq`) — atomic under concurrent inserts by construction, matching this project's established preference for native Postgres features (arrays, `tsvector`, `xmin`) over hand-rolled equivalents. Produces the human-readable `"CS-000042"` shown throughout the frontend, never the raw `Guid` primary key.
- **`OrderTotals`** (subtotal/total, not in the original list) and **`OrderTimelineEntry`** (the append-only status history, doubling as this aggregate's own audit trail — `Order` also inherits `AuditableEntity`'s `CreatedBy`/`ModifiedBy`/`CreatedAtUtc`/`ModifiedAtUtc` for "who and when," so no second, parallel audit structure exists) are real, additive value objects/entities the original sketch didn't name.
- **`GuestContactInfo`** shipped as `GuestOrderInfo`, carrying `Name` *and* `Email` (not email-only as the sketch above states) — `CheckoutExperience.tsx`'s real, existing guest-checkout form has always collected both.
- **`DeliveryAddress`** was not built. `FulfillmentMethod` — a real, additive enum with a single member (`Pickup`) today, the same "one real member, not speculative others" precedent `ProductType.Beverage` already established in Sprint 5.2 — covers the one real fulfillment path; no delivery/address concept exists anywhere in this coffee shop's actual frontend history.
- **The real domain events** are `OrderCreated`, `OrderItemAdded`, `OrderItemRemoved`, `OrderSubmitted`, `OrderCancelled`, `OrderPaid`, `OrderCompleted`, `OrderFailed` — see [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md)'s own row-by-row reconciliation against the sketch's original `OrderPlaced`/`OrderPreparing`/`OrderReady`/`OrderRefunded` names.
- **A real, live-verified double-submission bug** (two concurrent identical checkout requests created two separate orders) is closed by a client-generated `IdempotencyKey` on `Order`, checked before any sequence value is consumed or pricing work is done — additive, not in the original sketch, added during this sprint's own adversarial review pass. See `Order.IdempotencyKey`'s own doc comment and [docs/reviews/sprint-5.3-review.md](reviews/sprint-5.3-review.md).

## Bounded context: Promotions

| | |
|---|---|
| Aggregate root | `Coupon` |
| Value objects | `DiscountRule` (a closed union: `Percentage`, `FixedAmount`, `FreeItem`, `FreeDelivery` — the same discriminated-union discipline `EffectConfig` already established on the frontend, never a boolean-soup of `isPercentage`/`isFixed`/... fields), `UsageLimit` (per-coupon total, and optionally per-customer) |
| Invariants | A `Coupon` cannot apply if `Now > ExpiresAt`, if its `UsageLimit` is exhausted, or if the cart subtotal is below its `MinimumSpend`. Applying a coupon is validated at `PlaceOrderCommand` time against the *current* cart, never trusted from client-supplied state — the discount amount the client displayed is a preview, the server always recomputes it authoritatively. |
| Domain events | `CouponCreated`, `CouponRedeemed`, `CouponExpired` |

## Bounded context: Payments

| | |
|---|---|
| Aggregate root | `Payment` (one per `Order`, referencing `OrderId` by value, never holding a navigation property back into the `Order` aggregate — payments and orders are separate bounded contexts communicating via domain events, exactly as [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) scenario 1 requires) |
| Value objects | `Money`, `PaymentProviderReference` (the opaque id a gateway gives back — Stripe's `PaymentIntent` id, Paymob's transaction id — stored as a string, never parsed/relied on for shape by domain code) |
| Invariants | A `Payment` is captured at most once per attempt; a second capture attempt against an already-captured `Payment` is a no-op, not a double charge (idempotency — see [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md)'s Idempotency-Key convention, which this aggregate's own application-service layer enforces before ever calling the gateway). |
| Domain events | `PaymentCaptured`, `PaymentFailed`, `PaymentRefunded` |
| Provider abstraction | `Payment` never depends on a specific gateway's SDK types — see [34_PAYMENTS_NOTIFICATIONS_SEARCH.md](34_PAYMENTS_NOTIFICATIONS_SEARCH.md)'s `IPaymentProvider` contract. |

## Bounded context: Engagement (Reviews & Favorites)

| | |
|---|---|
| Aggregate roots | `Review`, `Favorite` |
| Value objects | `Rating` (1–5, an integer value object, not a bare `int` — invalid ratings are unrepresentable, not just unvalidated) |
| Invariants | A `Review` requires a `UserId` who has a `Completed` order containing the reviewed `ProductId` — "verified purchase" enforced at the domain layer, not a UI-only badge. A `Favorite` is a simple `(UserId, ProductId)` pair with no independent lifecycle beyond existing/not-existing — deliberately not over-modeled. |
| Domain events | `ReviewSubmitted`, `FavoriteAdded`, `FavoriteRemoved` |

## Bounded context: Notifications

| | |
|---|---|
| Aggregate root | `NotificationRequest` — a queued intent to notify, not the notification channel itself |
| Value objects | `NotificationTemplate` (a template key + parameters, never a hand-built string at the call site — mirrors the frontend's own "no duplicated values outside tokens" discipline, applied to copy instead of colors) |
| Invariants | A `NotificationRequest` records its own delivery outcome (`Sent`/`Failed`/`Retrying`) — never fire-and-forget with no record, since "did the password-reset email actually go out" is a real support question this model must be able to answer. |
| Domain events | `NotificationQueued`, `NotificationSent`, `NotificationFailed` |
| Provider abstraction | See [34_PAYMENTS_NOTIFICATIONS_SEARCH.md](34_PAYMENTS_NOTIFICATIONS_SEARCH.md)'s `IEmailProvider`. |

## Bounded context: Content (CMS)

| | |
|---|---|
| Aggregate roots | `ContentBlock` (a generic, typed-by-`ContentType` block — `HomepageBanner`, `StoryChapterContent`, `FaqEntry`, `AiPromptTemplate`), each a thin wrapper, not five separate near-identical aggregates | 
| Value objects | `ContentType` (closed enum), `LocalizedText` (reserved shape for future i18n — a single-locale record today, structured so a future locale dimension is additive, not a schema rewrite; not built speculatively beyond this shape decision, per [17_ZERO_REWRITE_POLICY.md](17_ZERO_REWRITE_POLICY.md)'s anti-speculation half) |
| Invariants | A `ContentBlock` has at most one `Published` version live per `(ContentType, Key)` pair at a time; draft/publish is a real two-state flow (`Draft`/`Published`), not "whatever's in the table is live" |
| Domain events | `ContentPublished`, `ContentUnpublished` |
| Why this exists at all | "No hardcoded content," the brief's own words — `features/storytelling/data/chapters.ts`'s narrative copy, `features/onboarding/data/steps.ts`'s tour copy, and the AI Barista's system prompt (`features/ai-barista/lib/promptBuilder.ts`'s `AI_BARISTA_SYSTEM_PROMPT`) all become CMS-editable. The frontend's own data files become the *seed*/*fallback*, not the source of truth — see [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md)'s seed-data strategy. |

## Bounded context: Platform (Analytics, Audit, Settings, Media)

| | |
|---|---|
| Aggregate roots | `AuditLogEntry` (append-only — no update/delete repository methods exist for this aggregate, enforced at the repository interface level, not just convention), `SettingEntry` (a typed key-value store for runtime-configurable, non-content settings — feature flags, tax rate, delivery radius), `MediaAsset` (metadata row pointing at a Cloudinary-hosted asset — see [34_PAYMENTS_NOTIFICATIONS_SEARCH.md](34_PAYMENTS_NOTIFICATIONS_SEARCH.md)'s `IBlobStorageProvider`) |
| Analytics | Deliberately **not** an aggregate/write model at all — analytics is a read-side projection over domain events (`OrderPlaced`, `ProductViewed`, etc.), materialized into Redis-cached rollups and/or dedicated read tables by background jobs, never a write-path concern any command handler touches directly. See [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md) and [34_PAYMENTS_NOTIFICATIONS_SEARCH.md](34_PAYMENTS_NOTIFICATIONS_SEARCH.md). |
| Invariants | An `AuditLogEntry` is immutable once written — `Actor`, `Action`, `EntityType`, `EntityId`, `Timestamp`, `Payload` (a JSONB snapshot of what changed), never edited or deleted, including by admins. |
| Domain events | Audit/Settings/Media deliberately do **not** raise their own domain events for consumption elsewhere — `AuditLogEntry` *is itself* a consumer of every other context's events (see [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md)), not a producer; raising `AuditEntryCreated` events about audit entries would be a real, pointless cycle. |

## Cross-aggregate rule, stated once

No command handler ever loads and saves two aggregate roots from two different bounded contexts in one database transaction. Where a real-world operation looks like it needs to (placing an order needs to debit inventory *and* create the order), the two operations happen as two separate transactions coordinated by domain events and the outbox pattern — see [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md)'s "Order placement, worked example" and [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) scenario 1's full sequence diagram. This is DDD's own well-established rule ("one aggregate per transaction"), restated here as this project's own frozen contract because violating it is the single most common way a DDD design silently degrades into an anemic, tightly-coupled one over time.

## Related

[milestone-5-commerce-rfc.md](milestone-5-commerce-rfc.md) · [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) · [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md) · [32_COMMERCE_EVENT_CATALOG.md](32_COMMERCE_EVENT_CATALOG.md) · [adr/0010-backend-clean-architecture-ddd-cqrs.md](adr/0010-backend-clean-architecture-ddd-cqrs.md)
