using Coffeshop.Domain.Payments.Exceptions;
using Coffeshop.Domain.Payments.ValueObjects;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Payments;

/// <summary>
/// One real attempt to charge a <see cref="Payment"/> — a plain <c>Entity&lt;Guid&gt;</c> owned by
/// the <see cref="Payment"/> aggregate (never its own repository, never referenced by id from
/// outside), not a second aggregate. A customer retrying a declined card produces a second
/// <see cref="PaymentAttempt"/> against the *same* <see cref="Payment"/>, not a second
/// <see cref="Payment"/> — one <see cref="Payment"/> per <c>Order</c>, per docs/30_COMMERCE_DDD_MODEL.md's
/// own frozen invariant, regardless of how many attempts it takes to succeed.
/// </summary>
public sealed class PaymentAttempt : Entity<Guid>
{
    public PaymentAttemptStatus Status { get; private set; }

    public PaymentProviderReference? ProviderReference { get; private set; }

    public PaymentMethod? Method { get; private set; }

    public PaymentFailure? Failure { get; private set; }

    public DateTimeOffset StartedAtUtc { get; private set; }

    public DateTimeOffset? ResolvedAtUtc { get; private set; }

    private PaymentAttempt()
    {
    }

    internal static PaymentAttempt Start(PaymentProviderReference providerReference, DateTimeOffset occurredAtUtc) =>
        new()
        {
            Id = Guid.NewGuid(),
            Status = PaymentAttemptStatus.Started,
            ProviderReference = providerReference,
            StartedAtUtc = occurredAtUtc,
        };

    internal void Authorize(DateTimeOffset occurredAtUtc)
    {
        EnsureStatus(PaymentAttemptStatus.Started);
        Status = PaymentAttemptStatus.Authorized;
    }

    internal void Capture(PaymentMethod? method, DateTimeOffset occurredAtUtc)
    {
        if (Status is not (PaymentAttemptStatus.Started or PaymentAttemptStatus.Authorized))
        {
            throw new InvalidPaymentStatusException($"An attempt in '{Status}' status cannot be captured.");
        }

        Status = PaymentAttemptStatus.Captured;
        Method = method;
        ResolvedAtUtc = occurredAtUtc;
    }

    internal void Decline(PaymentFailure failure, DateTimeOffset occurredAtUtc)
    {
        EnsureOpen();
        Status = PaymentAttemptStatus.Declined;
        Failure = failure;
        ResolvedAtUtc = occurredAtUtc;
    }

    internal void Error(PaymentFailure failure, DateTimeOffset occurredAtUtc)
    {
        EnsureOpen();
        Status = PaymentAttemptStatus.Errored;
        Failure = failure;
        ResolvedAtUtc = occurredAtUtc;
    }

    internal void Timeout(DateTimeOffset occurredAtUtc)
    {
        EnsureOpen();
        Status = PaymentAttemptStatus.TimedOut;
        ResolvedAtUtc = occurredAtUtc;
    }

    private void EnsureOpen()
    {
        if (Status is not (PaymentAttemptStatus.Started or PaymentAttemptStatus.Authorized))
        {
            throw new InvalidPaymentStatusException($"An attempt in '{Status}' status can no longer be resolved.");
        }
    }

    private void EnsureStatus(PaymentAttemptStatus expected)
    {
        if (Status != expected)
        {
            throw new InvalidPaymentStatusException($"Expected an attempt in '{expected}' status, found '{Status}'.");
        }
    }
}
