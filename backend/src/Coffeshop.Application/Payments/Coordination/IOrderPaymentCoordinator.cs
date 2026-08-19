namespace Coffeshop.Application.Payments.Coordination;

/// <summary>
/// The real integration point between Payments and Ordering/Inventory — deliberately a plain,
/// directly-injected coordinator, never a public MediatR command, for the exact same reason
/// <c>IInventoryReservationCoordinator</c> already established in Sprint 5.4: <c>UnitOfWorkBehavior</c>
/// calls <c>SaveChangesAsync</c> exactly once per top-level MediatR request, so a nested
/// <c>sender.Send(...)</c> from inside <c>ConfirmPaymentCommandHandler</c>/<c>ProcessPaymentWebhookCommandHandler</c>
/// would split "capture the payment" and "mark the order paid" into two separate transactions —
/// exactly the crash-between-them risk this design avoids by construction.
///
/// Maps this sprint's own Phase 7 brief diagram onto the *real, existing* <c>Order</c> state
/// machine rather than inventing new states: "Order Confirmed" is the existing <c>Order.MarkPaid</c>
/// (there is no separate "Confirmed" `OrderStatus` member, and adding one would risk
/// docs/37_API_STABILITY_POLICY.md's own frozen-enum concern for no real behavioral gain — `Paid`
/// already means exactly this). "Payment Failed → Order Cancelled" in that same diagram is real
/// only for a payment that's been explicitly abandoned (<see cref="OnPaymentAbandonedAsync"/>,
/// mapped onto the existing <c>Order.Fail</c> — "a submitted order that couldn't be paid," per
/// that method's own Sprint 5.3 doc comment) — a *single declined attempt* never reaches this
/// coordinator at all; see <c>Payment.DeclineAttempt</c>'s own doc comment for why retrying stays
/// entirely inside the Payments context until the customer/staff truly gives up.
/// </summary>
public interface IOrderPaymentCoordinator
{
    /// <summary>Real money has moved. Calls the existing, unmodified <c>Order.MarkPaid</c> then <c>IInventoryReservationCoordinator.ConsumeForOrderAsync</c> — the identical two-step sequence <c>PayOrderCommandHandler</c> (Sprint 5.3's staff-manual path) already performs, now reachable from the real customer-facing gateway flow too.</summary>
    Task OnPaymentSucceededAsync(Guid orderId, DateTimeOffset nowUtc, CancellationToken ct);

    /// <summary>This checkout is genuinely abandoned — not a single declined attempt, but an explicit give-up (<c>CancelPaymentCommand</c>) or an expired session. Calls <c>Order.Fail</c> then <c>IInventoryReservationCoordinator.ReleaseForOrderAsync</c>, the identical sequence <c>FailOrderCommandHandler</c> already performs.</summary>
    Task OnPaymentAbandonedAsync(Guid orderId, string reason, DateTimeOffset nowUtc, CancellationToken ct);
}
