using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Payments.Events;

/// <summary>
/// This sprint's own Phase 8 brief names 10 event types. Nine are real aggregate-raised domain
/// events, below. The tenth, <c>payment:webhook-invalid</c>, is deliberately NOT one of them —
/// an invalid/unverifiable webhook (bad signature, unknown reference) has no real aggregate to
/// raise it from, the same reasoning docs/36_SECURITY_MODEL.md's own audit-trail section already
/// gives for <c>LoginFailed</c> ("not a domain event of any aggregate; raised by the auth
/// endpoint itself, rate-limited and logged even though no state changes"). See
/// <c>PaymentWebhookEndpoint</c>'s own doc comment for where that one is actually logged/audited.
/// </summary>
public sealed record PaymentStartedEvent(Guid PaymentId, Guid OrderId, Guid AttemptId, decimal Amount) : DomainEvent;

/// <summary>Raised instead of <see cref="PaymentStartedEvent"/> when a new <see cref="PaymentAttempt"/> begins against a <see cref="Payment"/> that already has at least one prior (declined/errored/timed-out) attempt — the real "customer clicked Retry" signal.</summary>
public sealed record PaymentRetryEvent(Guid PaymentId, Guid OrderId, Guid AttemptId, int AttemptNumber) : DomainEvent;

public sealed record PaymentAuthorizedEvent(Guid PaymentId, Guid OrderId, Guid AttemptId, string ProviderReference) : DomainEvent;

public sealed record PaymentCapturedEvent(Guid PaymentId, Guid OrderId, Guid AttemptId, decimal Amount, string ProviderReference) : DomainEvent;

/// <summary>A customer-facing decline (card rejected) — distinct from <see cref="PaymentProviderErrorEvent"/>, see <c>PaymentAttemptStatus</c>'s own doc comment.</summary>
public sealed record PaymentFailedEvent(Guid PaymentId, Guid OrderId, Guid AttemptId, string FailureCode, string FailureMessage) : DomainEvent;

/// <summary>Something wrong with the integration/gateway itself (network error, malformed response, gateway 5xx) — an ops-alerting-worthy outcome, never shown to the customer as "your card was declined."</summary>
public sealed record PaymentProviderErrorEvent(Guid PaymentId, Guid OrderId, Guid AttemptId, string ProviderName, string ErrorDetail) : DomainEvent;

public sealed record PaymentTimeoutEvent(Guid PaymentId, Guid OrderId, Guid AttemptId) : DomainEvent;

public sealed record PaymentRefundedEvent(Guid PaymentId, Guid OrderId, decimal Amount, bool IsFullRefund, string? Reason) : DomainEvent;

/// <summary>Raised alongside <see cref="PaymentCapturedEvent"/> — the real moment a receipt becomes meaningful to show a customer. See <c>PaymentReceiptDto</c>'s own doc comment for why this project composes a receipt at read time rather than persisting a separate stored document.</summary>
public sealed record PaymentReceiptCreatedEvent(Guid PaymentId, Guid OrderId) : DomainEvent;

/// <summary>Raised by <see cref="Payment.RecordWebhookReceived"/> — a real webhook, signature-verified and correlated to this specific payment. Never raised for a webhook that fails verification or can't be matched to a known payment; see this file's own top-level doc comment.</summary>
public sealed record PaymentWebhookReceivedEvent(Guid PaymentId, Guid OrderId, string ProviderEventId, string EventType) : DomainEvent;
