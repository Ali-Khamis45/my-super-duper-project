# 34 — Payments, Notifications & Search

Phase 0 deliverable. Three cross-cutting concerns unified by the same discipline: **never bind business logic to one vendor.** Every one of these is a thin domain contract plus a swappable provider — the backend's version of the frontend's `AIProvider` interface (Sprint 3.9), applied three more times.

## Payment provider abstraction

```csharp
public interface IPaymentProvider
{
    string ProviderName { get; } // "stripe", "paymob", "paypal" — for logging/audit, never branched on in domain code
    Task<PaymentIntentResult> CreateIntentAsync(Money amount, string idempotencyKey, CancellationToken ct);
    Task<CaptureResult> CaptureAsync(string providerReference, CancellationToken ct);
    Task<RefundResult> RefundAsync(string providerReference, Money amount, CancellationToken ct);
}
```

`Payment` (the aggregate, [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)) and every command handler that touches payments depends only on `IPaymentProvider` — never on `Stripe.net`'s or Paymob's SDK types directly. The active provider is resolved by DI, configurable per environment (a `Payments:Provider` setting), and multiple providers can be registered simultaneously keyed by name if a future requirement needs "Stripe for cards, Paymob for regional wallets, chosen at checkout time" — the interface already supports that, the concrete implementation is Sprint 5.3 work, not designed further here since no such requirement exists yet.

**Idempotency, concretely**: `CreateIntentAsync` always receives the same `Idempotency-Key` a retried `PlaceOrderCommand` would carry (per [31_COMMERCE_ENGINEERING_CONTRACTS.md](31_COMMERCE_ENGINEERING_CONTRACTS.md)) — passed straight through to the underlying gateway's own idempotency mechanism (Stripe natively supports this; a provider that doesn't gets it emulated at the `IPaymentProvider` implementation level, e.g. checking a local dedup table before calling the gateway).

**PCI scope, stated explicitly**: this backend **never touches raw card data**. Every provider's client-side SDK (Stripe Elements, Paymob's iframe, PayPal's own checkout redirect) collects card details directly in the browser and returns an opaque token/intent id — the backend only ever sees that reference, never a PAN/CVV. This is what keeps this project out of PCI-DSS SAQ D scope entirely (the strictest tier) and into the much lighter SAQ A — a real, load-bearing architectural decision, not a detail.

## Coupon domain rules

Already modeled in [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)'s Promotions context; this section is the rule table the brief's own four coupon types resolve to:

| Type | `DiscountRule` shape | Applied as |
|---|---|---|
| Percentage | `{ Kind: Percentage, Value: 0-100 }` | `subtotal * (1 - value/100)`, never applied to delivery fee |
| Fixed amount | `{ Kind: FixedAmount, Value: Money }` | `max(0, subtotal - value)` — never produces a negative total |
| Free item | `{ Kind: FreeItem, ProductId }` | Adds a zero-priced `OrderLine` for the named product if not already present in the cart — never removes/discounts an existing line |
| Free delivery | `{ Kind: FreeDelivery }` | Zeroes the delivery-fee line only |

Every `Coupon` also carries `ExpiresAt`, `UsageLimit` (total), `PerCustomerLimit` (optional), and `MinimumSpend` — validated server-side at `PlaceOrderCommand` time, as [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) scenario 3 already establishes. "Campaign support" (the brief's own phrase) is modeled as a `CampaignId` grouping value object on `Coupon` — multiple codes belonging to one named campaign, for reporting, not a separate aggregate.

## Order lifecycle

Fully specified in [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)'s Ordering section and state diagram — referenced here, not repeated, per this project's own "don't restate, index" documentation convention.

## Inventory strategy

Fully specified in [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)'s Inventory section (ingredient-level tracking, reservation-then-debit) and [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) scenario 1's worked sequence — referenced here for the one piece not yet detailed: **the reservation mechanism itself.**

```csharp
public interface IInventoryReservation
{
    // Redis-backed, TTL'd (10 minutes — long enough for a real checkout
    // flow including a slow payment provider redirect, short enough that
    // an abandoned cart doesn't hold phantom stock for hours).
    Task<ReservationId> ReserveAsync(IReadOnlyList<(Guid IngredientId, int Quantity)> items, CancellationToken ct);
    Task ConfirmAsync(ReservationId id, CancellationToken ct); // converts to a real StockDebited
    Task ReleaseAsync(ReservationId id, CancellationToken ct); // explicit release (cancel) or implicit (TTL expiry)
}
```

Implemented as a Redis sorted-set-per-ingredient hold, not a PostgreSQL row — a reservation is inherently ephemeral state, and using the cache layer already provisioned for [35_INFRASTRUCTURE_AND_DEPLOYMENT.md](35_INFRASTRUCTURE_AND_DEPLOYMENT.md)'s other needs avoids adding a second "temporary state" mechanism to the relational schema.

## Search architecture

| | |
|---|---|
| v1 implementation | PostgreSQL full-text search — a generated `tsvector` column over `Product.Name`/`Description`/`Tags`, a GIN index, `ts_rank` for relevance ordering; `pg_trgm` trigram indexes for fuzzy/typo-tolerant matching on top |
| Contract | `ISearchService.SearchAsync(query, filters) -> IReadOnlyList<ProductId ranked>` — every consumer (the `SearchProductsQuery` handler, a future admin search box) depends on this interface, never on raw SQL or a specific engine's query DSL |
| Autocomplete | A separate, cheap endpoint (`GET /v1/products/autocomplete?q=`) backed by a Redis-cached prefix-trie-ish sorted set of product names, rebuilt on `ProductCreated`/`-Updated` — deliberately not routed through the full-text search path, since autocomplete has a much tighter latency budget and a much simpler ranking need |
| Synonyms | A small, admin-editable `SearchSynonym` table (`"latte" ↔ "café latte"`, seeded from real menu terminology) folded into the `tsquery` construction — not PostgreSQL's built-in thesaurus dictionary (real, but harder to administer for a small, curated synonym set than a simple table an admin can edit through the CMS) |
| Future-Elastic-compatible | `ISearchService`'s contract is engine-agnostic by construction — see [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) scenario 9 for the explicit, honest "not built now" reasoning |

## Notification / email architecture

```csharp
public interface IEmailProvider
{
    Task SendAsync(string toEmail, string templateKey, IReadOnlyDictionary<string, string> parameters, CancellationToken ct);
}
```

One interface, a concrete SMTP/SendGrid/Postmark-backed implementation chosen at deploy time (never hardcoded), fed by `NotificationRequest` ([30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md)). Templates are razor-based (`.cshtml` email templates, rendered server-side to HTML), keyed by `templateKey` — never a hand-built string at a call site:

| Template key | Trigger | Parameters |
|---|---|---|
| `email-verification` | `UserRegistered` | `verificationLink` |
| `password-reset` | `PasswordResetRequested` | `resetLink` |
| `order-confirmation` | `OrderPaid` | `orderId, items, total` |
| `order-ready` | `OrderReady` | `orderId` |
| `receipt` | `OrderCompleted` | `orderId, invoiceLink` (see Invoice generation below) |
| `promotion` | Admin-initiated campaign send (Sprint 5.4 scope, not built in Phase 0) | `campaignId, couponCode` |
| `newsletter` | Admin-initiated (Sprint 5.4 scope) | `campaignId` |
| `low-stock-alert` | `LowStockThresholdCrossed` | `ingredientName, currentBalance` (sent to a configured admin distribution address, not a customer) |

**Invoice generation**: a PDF rendered server-side (QuestPDF or similar) from the same `OrderDto` the storefront already displays, on-demand at `GET /v1/orders/{id}/invoice` (never pre-generated and stored — an `Order`'s line items are already immutable post-`Paid`, so the PDF is always reproducible from the same source of truth, no separate document-storage concern beyond what [35_INFRASTRUCTURE_AND_DEPLOYMENT.md](35_INFRASTRUCTURE_AND_DEPLOYMENT.md)'s blob storage already provides if caching the rendered PDF is later worth it).

## Blob storage abstraction (media)

Same pattern, third instance:

```csharp
public interface IBlobStorageProvider
{
    Task<string> UploadAsync(Stream content, string fileName, string contentType, CancellationToken ct); // returns a public URL
    Task DeleteAsync(string url, CancellationToken ct);
}
```

Cloudinary is the concrete implementation named in the brief (product/ingredient images, uploaded through the admin CMS) — never referenced by type outside the one `CloudinaryBlobStorageProvider` class implementing this interface.

## Related

[milestone-5-commerce-rfc.md](milestone-5-commerce-rfc.md) · [30_COMMERCE_DDD_MODEL.md](30_COMMERCE_DDD_MODEL.md) · [29_COMMERCE_ARCHITECTURE_FREEZE.md](29_COMMERCE_ARCHITECTURE_FREEZE.md) · [35_INFRASTRUCTURE_AND_DEPLOYMENT.md](35_INFRASTRUCTURE_AND_DEPLOYMENT.md) · [36_SECURITY_MODEL.md](36_SECURITY_MODEL.md)
