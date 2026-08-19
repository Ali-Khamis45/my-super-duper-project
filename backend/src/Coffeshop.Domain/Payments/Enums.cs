namespace Coffeshop.Domain.Payments;

/// <summary>
/// The <c>Payment</c> aggregate's own status — distinct from <c>Coffeshop.Domain.Ordering.OrderStatus</c>
/// on purpose: a customer can retry a declined card several times against the same
/// <see cref="Payment"/> (see <see cref="PaymentAttempt"/>/<see cref="PaymentAttemptStatus"/>)
/// without the <c>Order</c> itself ever leaving <c>Submitted</c> — only a real success moves the
/// <c>Order</c> forward (via the existing, unmodified <c>Order.MarkPaid</c>). <c>Pending</c> covers
/// both "no attempt yet" and "an attempt was declined, awaiting a retry" — there is no separate
/// "awaiting retry" member, since from the <c>Payment</c> aggregate's own point of view both states
/// mean the exact same thing: not yet succeeded, still open to a new <see cref="PaymentAttempt"/>.
/// </summary>
public enum PaymentStatus
{
    Pending,
    Processing,
    Succeeded,
    Cancelled,
    Refunded,
    PartiallyRefunded,
}

/// <summary>
/// One <see cref="PaymentAttempt"/>'s own lifecycle — <c>Declined</c> (the customer's card was
/// rejected, a normal business outcome) is deliberately a distinct member from <c>Errored</c>
/// (something is wrong with the integration/gateway itself, an ops-alerting-worthy outcome) —
/// see <see cref="PaymentFailure"/>'s own doc comment for why this distinction is real, not
/// cosmetic.
/// </summary>
public enum PaymentAttemptStatus
{
    Started,
    Authorized,
    Captured,
    Declined,
    Errored,
    TimedOut,
}

/// <summary>The real, closed set of gateways this backend integrates with — matches <c>FulfillmentMethod</c>'s own "closed enum, real members only" precedent (Sprint 5.2). <see cref="Fake"/> is not a placeholder; it is a real, fully-functional in-process simulator used for local/CI verification, the same role Mailhog already plays for email — see <c>FakePaymentGateway</c>'s own doc comment.</summary>
public enum PaymentProviderName
{
    Stripe,
    Fake,
}
