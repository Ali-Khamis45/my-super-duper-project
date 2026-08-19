namespace Coffeshop.Application.Common.Options;

/// <summary>
/// Bound from configuration's <c>PaymentRetry</c> section. Governs how long a <c>Payment</c> may
/// sit in <see cref="Coffeshop.Domain.Payments.PaymentStatus.Processing"/> before
/// <c>CreateCheckoutSessionCommandHandler</c> treats its current attempt as abandoned (the client
/// disconnected before either <c>ConfirmPaymentCommand</c> or the webhook ever resolved it) and
/// times it out via <c>Payment.TimeoutAttempt</c> to let a genuinely new attempt start — the
/// lazy, on-next-access recovery Sprint 5.5's own review disclosed as a real, unfixed gap
/// (<c>Payment.TimeoutAttempt</c> had no caller at all). Mirrors the same "reclaim on next real
/// access, no background sweep" shape <c>InventoryReservationCoordinator</c> already established
/// for expired reservation holds — not a new architectural pattern, the same one reapplied.
/// </summary>
public sealed class PaymentRetryOptions
{
    public const string SectionName = "PaymentRetry";

    /// <summary>
    /// How long a Processing payment's current attempt is still treated as genuinely in flight
    /// before it's considered abandoned. Conservative default: a real gateway round trip
    /// completes in seconds, not minutes, so 15 minutes comfortably covers a slow network without
    /// prematurely timing out an attempt the customer is still actually completing.
    /// </summary>
    public int StuckAttemptTimeoutMinutes { get; init; } = 15;
}
