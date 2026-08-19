namespace Coffeshop.Application.Payments.Dtos;

public sealed record PaymentAttemptDto(
    Guid Id,
    string Status,
    string? ProviderReference,
    string? MethodDescription,
    string? FailureCode,
    string? FailureMessage,
    string? DeclineCode,
    DateTimeOffset StartedAtUtc,
    DateTimeOffset? ResolvedAtUtc);

/// <summary>The full payment — everything <c>GetPaymentQuery</c> returns, including every attempt (a real retry history, not just the current one). <c>OrderNumber</c> is resolved at query time from Ordering (the same cross-context repository-lookup pattern <c>InventoryReservationDto.OrderNumber</c> already established in Sprint 5.4), never denormalized onto <c>Payment</c> itself.</summary>
public sealed record PaymentDto(
    Guid Id,
    Guid OrderId,
    string? OrderNumber,
    decimal Amount,
    string Currency,
    string Status,
    string Provider,
    decimal RefundedAmount,
    IReadOnlyCollection<PaymentAttemptDto> Attempts,
    DateTimeOffset CreatedAtUtc);

/// <summary>The lean list shape for <c>ListPaymentsQuery</c>/<c>AdminPaymentSearchQuery</c> — no attempt history, matching <c>OrderSummaryDto</c>'s own "list view never needs the full aggregate" precedent.</summary>
public sealed record PaymentSummaryDto(
    Guid Id,
    Guid OrderId,
    string? OrderNumber,
    decimal Amount,
    string Status,
    string Provider,
    DateTimeOffset CreatedAtUtc);

/// <summary>The real response shape <c>CreateCheckoutSessionCommand</c> returns — everything the frontend's Stripe.js (or the fake-gateway equivalent) needs to actually collect/confirm a charge client-side. <c>ClientSecret</c>/<c>PublishableKey</c> are <c>null</c> for a gateway that has no client-side confirmation step (the fake gateway resolves synchronously server-side — see <c>FakePaymentGateway</c>'s own doc comment).</summary>
public sealed record PaymentSessionDto(
    Guid PaymentId,
    Guid AttemptId,
    string Provider,
    string? ClientSecret,
    string? PublishableKey,
    string Status);

public sealed record PaymentReceiptLineDto(string ProductName, int Quantity, decimal LineTotal);

/// <summary>
/// Composed live, at read time, from the already-real <c>Payment</c> + <c>Order</c> data — never
/// a separately stored/generated document. docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md's own sketch
/// names a PDF invoice rendered on-demand from the same source of truth; this sprint builds the
/// on-demand *page* half of that (a real receipt view backed by real data), not the PDF-rendering
/// half — no real caller needs a downloadable PDF yet, and standing up a rendering pipeline
/// (QuestPDF or similar) for one nobody asked for this sprint would be exactly the speculative
/// infrastructure this project's conventions forbid. Reproducible on demand at any time since
/// both <c>Order</c>'s line items and a captured <c>Payment</c>'s amount are immutable once set.
/// </summary>
public sealed record PaymentReceiptDto(
    Guid PaymentId,
    string OrderNumber,
    decimal Amount,
    string Currency,
    string? MethodDescription,
    DateTimeOffset? PaidAtUtc,
    IReadOnlyCollection<PaymentReceiptLineDto> Items);
