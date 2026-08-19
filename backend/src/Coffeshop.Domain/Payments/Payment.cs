using Coffeshop.Domain.Catalog.ValueObjects;
using Coffeshop.Domain.Payments.Events;
using Coffeshop.Domain.Payments.Exceptions;
using Coffeshop.Domain.Payments.ValueObjects;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Payments;

/// <summary>
/// The Payments bounded context's aggregate root — one per <c>Order</c>, referencing
/// <see cref="OrderId"/> by value only, never a navigation property back into the <c>Order</c>
/// aggregate (Payments and Ordering are separate bounded contexts, exactly as
/// docs/30_COMMERCE_DDD_MODEL.md's frozen Payments sketch and
/// docs/29_COMMERCE_ARCHITECTURE_FREEZE.md scenario 1 both require).
///
/// A customer retrying a declined card produces a new <see cref="PaymentAttempt"/> against this
/// *same* aggregate, never a second <see cref="Payment"/> for the same order — "a Payment is
/// captured at most once" (the frozen sketch's own invariant) is enforced by
/// <see cref="CaptureAttempt"/> refusing to run against anything but a still-open attempt.
///
/// A single declined/errored/timed-out attempt never fails the <c>Order</c> itself — <see cref="Status"/>
/// returns to <see cref="PaymentStatus.Pending"/> after each unsuccessful attempt, ready for a new
/// one, and the owning <c>Order</c> stays <c>Submitted</c> throughout (see
/// <c>IOrderPaymentCoordinator</c>'s own doc comment for the real integration point). Only an
/// explicit <see cref="Cancel"/> (the customer/staff gives up on this checkout entirely) reaches a
/// terminal, non-retryable state without ever succeeding.
/// </summary>
public sealed class Payment : AuditableEntity<Guid>
{
    private readonly List<PaymentAttempt> _attempts = [];

    public Guid OrderId { get; private set; }

    public Money Amount { get; private set; } = null!;

    public PaymentStatus Status { get; private set; }

    public PaymentProviderName Provider { get; private set; }

    public IdempotencyKey IdempotencyKey { get; private set; } = null!;

    public Money RefundedAmount { get; private set; } = null!;

    public IReadOnlyCollection<PaymentAttempt> Attempts => _attempts.AsReadOnly();

    /// <summary>The most recent attempt — never persisted separately, always the last element of <see cref="Attempts"/>. <c>null</c> only for a brand-new <see cref="Payment"/> before <see cref="StartAttempt"/> has ever been called.</summary>
    public PaymentAttempt? CurrentAttempt => _attempts.Count > 0 ? _attempts[^1] : null;

    private Payment()
    {
    }

    public static Payment Create(Guid orderId, Money amount, PaymentProviderName provider, IdempotencyKey idempotencyKey, DateTimeOffset occurredAtUtc)
    {
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            OrderId = orderId,
            Amount = amount,
            Status = PaymentStatus.Pending,
            Provider = provider,
            IdempotencyKey = idempotencyKey,
            RefundedAmount = Money.Zero(amount.Currency),
        };

        return payment;
    }

    /// <summary>
    /// Begins a new <see cref="PaymentAttempt"/> — the real backing for both a first-time charge
    /// and a "Retry payment" click (a <see cref="Payment"/> with one or more prior
    /// declined/errored/timed-out attempts is still <see cref="PaymentStatus.Pending"/>, so this
    /// method accepts a new attempt against it exactly the same way). Raises
    /// <see cref="PaymentRetryEvent"/> instead of <see cref="PaymentStartedEvent"/> whenever a
    /// prior attempt already exists — the real "is this a retry" signal, not inferred elsewhere.
    /// </summary>
    public PaymentAttempt StartAttempt(PaymentProviderReference providerReference, DateTimeOffset occurredAtUtc)
    {
        if (Status != PaymentStatus.Pending)
        {
            throw new InvalidPaymentStatusException($"A payment in '{Status}' status cannot start a new attempt.");
        }

        var isRetry = _attempts.Count > 0;
        var attempt = PaymentAttempt.Start(providerReference, occurredAtUtc);
        _attempts.Add(attempt);
        Status = PaymentStatus.Processing;

        AddDomainEvent(isRetry
            ? new PaymentRetryEvent(Id, OrderId, attempt.Id, _attempts.Count)
            : new PaymentStartedEvent(Id, OrderId, attempt.Id, Amount.Amount));

        return attempt;
    }

    public void AuthorizeAttempt(Guid attemptId, DateTimeOffset occurredAtUtc)
    {
        var attempt = GetAttempt(attemptId);
        attempt.Authorize(occurredAtUtc);
        AddDomainEvent(new PaymentAuthorizedEvent(Id, OrderId, attempt.Id, attempt.ProviderReference!.Value));
    }

    /// <summary>The real "money has actually moved" moment — moves <see cref="Status"/> to <see cref="PaymentStatus.Succeeded"/>, the trigger <c>IOrderPaymentCoordinator</c> reacts to by calling the existing, unmodified <c>Order.MarkPaid</c>/<c>IInventoryReservationCoordinator.ConsumeForOrderAsync</c>.</summary>
    public void CaptureAttempt(Guid attemptId, PaymentMethod? method, DateTimeOffset occurredAtUtc)
    {
        var attempt = GetAttempt(attemptId);
        attempt.Capture(method, occurredAtUtc);
        Status = PaymentStatus.Succeeded;

        AddDomainEvent(new PaymentCapturedEvent(Id, OrderId, attempt.Id, Amount.Amount, attempt.ProviderReference!.Value));
        AddDomainEvent(new PaymentReceiptCreatedEvent(Id, OrderId));
    }

    /// <summary>A customer-facing decline — <see cref="Status"/> returns to <see cref="PaymentStatus.Pending"/>, ready for <see cref="StartAttempt"/> to be called again. See this class's own doc comment for why a single decline never fails the order.</summary>
    public void DeclineAttempt(Guid attemptId, PaymentFailure failure, DateTimeOffset occurredAtUtc)
    {
        var attempt = GetAttempt(attemptId);
        attempt.Decline(failure, occurredAtUtc);
        Status = PaymentStatus.Pending;
        AddDomainEvent(new PaymentFailedEvent(Id, OrderId, attempt.Id, failure.Code, failure.Message));
    }

    /// <summary>A gateway/integration-level failure, not a customer decline — see <see cref="PaymentAttemptStatus"/>'s own doc comment for the distinction. Also returns <see cref="Status"/> to <see cref="PaymentStatus.Pending"/> so a retry is still possible (a transient gateway error shouldn't permanently block checkout).</summary>
    public void ErrorAttempt(Guid attemptId, PaymentFailure failure, DateTimeOffset occurredAtUtc)
    {
        var attempt = GetAttempt(attemptId);
        attempt.Error(failure, occurredAtUtc);
        Status = PaymentStatus.Pending;
        AddDomainEvent(new PaymentProviderErrorEvent(Id, OrderId, attempt.Id, Provider.ToString(), failure.Message));
    }

    public void TimeoutAttempt(Guid attemptId, DateTimeOffset occurredAtUtc)
    {
        var attempt = GetAttempt(attemptId);
        attempt.Timeout(occurredAtUtc);
        Status = PaymentStatus.Pending;
        AddDomainEvent(new PaymentTimeoutEvent(Id, OrderId, attempt.Id));
    }

    /// <summary>The customer/staff gives up on this checkout entirely — a terminal state, never retryable (unlike a single declined attempt). No dedicated domain event: the owning <c>Order.Fail</c> call <c>IOrderPaymentCoordinator</c> makes alongside this already raises the real "this checkout was abandoned" signal (<c>OrderFailedEvent</c>) — this sprint's own Phase 8 brief names no distinct <c>payment:cancelled</c> event, and inventing one with no real consumer would be exactly the speculative event this project's conventions forbid.</summary>
    public void Cancel(DateTimeOffset occurredAtUtc)
    {
        if (Status is not (PaymentStatus.Pending or PaymentStatus.Processing))
        {
            throw new InvalidPaymentStatusException($"A payment in '{Status}' status can no longer be cancelled.");
        }

        Status = PaymentStatus.Cancelled;
    }

    /// <summary>Admin-only (enforced at the application/API layer, <c>PermissionCodes.ProcessRefunds</c>) — a full or partial reversal against an already-<see cref="PaymentStatus.Succeeded"/>/<see cref="PaymentStatus.PartiallyRefunded"/> payment. Deliberately never touches the owning <c>Order</c>'s own status — refunding a served drink doesn't retroactively "un-serve" it; see this sprint's own review for the full reasoning.</summary>
    public void Refund(Money amount, string? reason, DateTimeOffset occurredAtUtc)
    {
        if (Status is not (PaymentStatus.Succeeded or PaymentStatus.PartiallyRefunded))
        {
            throw new InvalidPaymentStatusException($"A payment in '{Status}' status cannot be refunded.");
        }

        var remaining = Amount.Subtract(RefundedAmount);
        if (amount.Amount <= 0 || amount.Amount > remaining.Amount)
        {
            throw new InvalidRefundAmountException($"Cannot refund {amount.Amount:0.00} — only {remaining.Amount:0.00} remains refundable.");
        }

        RefundedAmount = RefundedAmount.Add(amount);
        var isFullRefund = RefundedAmount.Amount == Amount.Amount;
        Status = isFullRefund ? PaymentStatus.Refunded : PaymentStatus.PartiallyRefunded;

        AddDomainEvent(new PaymentRefundedEvent(Id, OrderId, amount.Amount, isFullRefund, reason));
    }

    /// <summary>A real, signature-verified webhook, correlated to this specific payment — see docs/32_COMMERCE_EVENT_CATALOG.md's own Sprint 5.5 note on why an *invalid*/uncorrelated webhook never reaches this method (there is no aggregate to raise it from).</summary>
    public void RecordWebhookReceived(string providerEventId, string eventType, DateTimeOffset occurredAtUtc) =>
        AddDomainEvent(new PaymentWebhookReceivedEvent(Id, OrderId, providerEventId, eventType));

    private PaymentAttempt GetAttempt(Guid attemptId) =>
        _attempts.FirstOrDefault(a => a.Id == attemptId) ?? throw new PaymentAttemptNotFoundException();
}
