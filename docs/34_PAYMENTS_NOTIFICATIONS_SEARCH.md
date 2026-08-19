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

**Implementation status, Sprint 5.5**: real, built, and live-verified against `FakePaymentGateway` (see below) — every claim in the two paragraphs above holds in the shipped code, with a small number of real, honest naming/shape differences from this Phase 0 sketch:

- The interface is `IPaymentGateway`, not `IPaymentProvider` — "provider" was already claimed by `PaymentProviderName` (the enum: `Stripe`/`Fake`), so the *gateway integration* contract needed its own distinct name once a second real implementation existed to tell them apart. `ProviderName`'s job above is done by `PaymentProviderName Provider { get; }`.
- No "multiple providers registered simultaneously, chosen at checkout time" — real config resolves exactly one active `IPaymentGateway` at startup (`Payments:Provider`, defaulting to `"Fake"`), per environment. The interface's shape doesn't prevent a future per-checkout provider choice; nothing in this sprint's real brief asked for one.
- Two real implementations exist: `StripePaymentGateway` (real `Stripe.net` SDK calls, real webhook signature verification via Stripe's own `EventUtility`) and `FakePaymentGateway` (a real, deterministic in-process simulator — magic-cents outcome convention, real HMAC-signed webhook payloads, mimicking Stripe's own `Stripe-Signature` header shape so the webhook code path is identical regardless of which gateway is active). **`StripePaymentGateway` is real, correct, compiled code that has never been exercised against Stripe's real servers this sprint** — no Stripe account/test API key exists in this development environment. Every real/live verification this sprint (unit, Application, and browser-driven Playwright tests) runs against `FakePaymentGateway` instead. This gap is disclosed, not glossed over — see docs/reviews/sprint-5.5-review.md.
- A real, disclosed limitation of the magic-cents test convention (`.13` → decline, `.14` → provider error): every catalog product price and ingredient modifier in this project is a multiple of $0.05, and summing multiples of five cents can never land on `.13`/`.14` cents. Declined/provider-error outcomes are therefore unreachable through any real order composed from the actual menu — verified instead by `PaymentCommandHandlerTests.cs` (Application layer, `IPaymentGateway` mocked directly to return the outcome under test) rather than a live end-to-end checkout.
- Real two-phase (authorize-then-capture) support exists (`PaymentsOptions.CaptureMode: "Manual"`, `GatewayPaymentOutcome.RequiresCapture`) — found genuinely necessary mid-sprint: `CapturePaymentCommand` existed from Phase 2 but, in its first cut, was real, correct, and completely unreachable (nothing ever produced an `Authorized`-only attempt for it to act on). Fixed rather than left as a placeholder — see this sprint's own review for the finding.

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

**Implementation status, Sprint 5.1 → 5.5**: no `IEmailProvider`/`templateKey`/Razor-template pipeline has been built — `SmtpEmailSender` (real MailKit SMTP, Mailhog in dev) sends plain inline-HTML messages for a small, fixed, growing set of transactional emails, one method per email (`SendEmailVerificationAsync`/`SendPasswordResetAsync`/`SendPasswordChangedAlertAsync` since Sprint 5.1, `SendOrderConfirmationAsync` added Sprint 5.5 for the real `order-confirmation` row below). A handful of fixed, one-off emails don't earn a full admin-editable template-catalog system yet — see `SmtpEmailSender`'s own doc comment. Order confirmation is sent from `ConfirmPaymentCommandHandler`/`ProcessPaymentWebhookCommandHandler` directly (whichever one actually resolves the payment), fire-and-forget with `CancellationToken.None` — a real, live-verified Sprint 5.5 finding: awaiting the SMTP round trip inline blocked the customer-facing confirm response long enough for a real browser to abort the request under load, even though the payment itself had already succeeded. See docs/reviews/sprint-5.5-review.md.

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
