using Coffeshop.Domain.Payments;

namespace Coffeshop.Application.Payments.Interfaces;

/// <summary>
/// Everything a gateway returns when a card is tokenized/charged — display-only, PCI-safe (never
/// raw card data). <c>MethodType</c>/<c>MethodBrand</c>/<c>MethodLast4</c> map directly onto
/// <c>Coffeshop.Domain.Payments.ValueObjects.PaymentMethod</c>. <see cref="RequiresCapture"/> is
/// <c>true</c> only for a genuine two-phase authorize-then-capture intent (<c>PaymentsOptions.CaptureMode</c>
/// <c>"Manual"</c>) that has authorized but not yet captured — <c>Succeeded</c> is still
/// <c>true</c> in that case (the card really was approved), but callers must call
/// <c>Payment.AuthorizeAttempt</c>, not <c>CaptureAttempt</c>, and must not treat the order as
/// paid until the real, explicit <c>CapturePaymentCommand</c> runs. Defaults to <c>false</c> so
/// every existing automatic-capture call site (the only mode either gateway used before this was
/// added) is unaffected.
/// </summary>
public sealed record GatewayPaymentOutcome(
    bool Succeeded,
    string? MethodType,
    string? MethodBrand,
    string? MethodLast4,
    string? FailureCode,
    string? FailureMessage,
    string? DeclineCode,
    bool IsProviderError,
    bool RequiresCapture = false);

public sealed record CreateIntentResult(string ProviderReference, string? ClientSecret, string? PublishableKey);

public sealed record RefundOutcome(bool Succeeded, string? ProviderRefundReference, string? FailureMessage);

/// <summary>
/// A real webhook event, already signature-verified and parsed by the gateway's own SDK — <c>null</c>
/// from <see cref="IPaymentGateway.TryParseWebhook"/> means verification failed (bad/missing
/// signature), the one case this project never raises a domain event for; see
/// docs/32_COMMERCE_EVENT_CATALOG.md's own Sprint 5.5 note. <see cref="OrderId"/> is read back
/// from the intent's own metadata (both real gateways attach <c>{ orderId }</c> at
/// <see cref="IPaymentGateway.CreateIntentAsync"/> time specifically so a webhook can correlate
/// back to a real <c>Payment</c> without a second lookup table) — never parsed out of
/// <see cref="ProviderReference"/> itself, which stays opaque per that value object's own doc
/// comment.
/// </summary>
public sealed record ParsedWebhookEvent(string ProviderEventId, string EventType, string ProviderReference, Guid OrderId, GatewayPaymentOutcome Outcome);

/// <summary>
/// Per docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md's frozen <c>IPaymentProvider</c> sketch, renamed
/// <c>IPaymentGateway</c> here — "provider" already names <see cref="PaymentProviderName"/> the
/// enum, and this interface is specifically the *gateway integration* contract, a real, minor
/// naming clarification made once real implementation (two concrete gateways) showed the two
/// concepts needed distinct names. Never depended on directly by domain code — only by
/// Application-layer command handlers, resolved by DI. See <c>StripePaymentGateway</c>/
/// <c>FakePaymentGateway</c> (Coffeshop.Infrastructure) for the two real implementations.
/// </summary>
public interface IPaymentGateway
{
    PaymentProviderName Provider { get; }

    /// <summary>Creates a real charge intent — for Stripe, a <c>PaymentIntent</c>; <paramref name="idempotencyKey"/> is passed straight through as the gateway's own native idempotency key (Stripe's real <c>Idempotency-Key</c> header), per docs/34's own "Idempotency, concretely" section.</summary>
    Task<CreateIntentResult> CreateIntentAsync(Guid orderId, decimal amount, string currency, string idempotencyKey, CancellationToken ct);

    /// <summary>Re-fetches the real, current status of a prior intent — the backing for <c>ConfirmPaymentCommand</c>'s optimistic post-client-confirmation check.</summary>
    Task<GatewayPaymentOutcome> GetStatusAsync(string providerReference, CancellationToken ct);

    /// <summary>Explicit capture for a two-phase authorize-then-capture flow — see <c>CapturePaymentCommand</c>'s own doc comment for when this is real vs. when automatic capture already resolved everything at confirmation time.</summary>
    Task<GatewayPaymentOutcome> CaptureAsync(string providerReference, CancellationToken ct);

    Task<RefundOutcome> RefundAsync(string providerReference, decimal amount, string currency, CancellationToken ct);

    /// <summary>Verifies the real cryptographic signature (Stripe's own <c>Stripe-Signature</c> header scheme) before ever trusting the payload — returns <c>null</c> on any verification failure, never throws for a bad signature (a malformed/forged webhook is an expected, not exceptional, input to this method).</summary>
    ParsedWebhookEvent? TryParseWebhook(string payload, string signatureHeader);
}
