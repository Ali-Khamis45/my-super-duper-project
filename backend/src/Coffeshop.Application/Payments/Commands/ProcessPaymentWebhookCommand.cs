using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Payments.Coordination;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Domain.Payments;
using Coffeshop.Domain.Payments.Exceptions;
using Coffeshop.Domain.Payments.ValueObjects;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Coffeshop.Application.Payments.Commands;

/// <summary>
/// The authoritative backstop for the exact same outcome <c>ConfirmPaymentCommand</c> also
/// resolves optimistically client-side — whichever one actually reaches a <see cref="Payment"/>
/// first "wins" (moves it out of <see cref="PaymentStatus.Processing"/>), and the other is a
/// real, verified-safe no-op, not a race that corrupts state. This is what makes "the browser
/// closed/lost network right after confirming" recoverable: the gateway's own webhook retries
/// until this endpoint returns success, independent of whether the customer's tab is even still
/// open.
///
/// Real replay protection, not aspirational: <see cref="IIdempotencyStore.TryReserveAsync"/> is
/// checked (keyed by the gateway's own event id) *before* any <see cref="Payment"/> is touched —
/// gateways explicitly document at-least-once webhook delivery, so a redelivered event reaching
/// this handler a second time is a normal, expected input, always a safe no-op.
/// </summary>
public sealed record ProcessPaymentWebhookCommand(string RawPayload, string SignatureHeader) : ICommand<Unit>;

internal sealed class ProcessPaymentWebhookCommandHandler(
    IPaymentRepository paymentRepository,
    IOrderRepository orderRepository,
    IUserRepository userRepository,
    IPaymentGateway paymentGateway,
    IIdempotencyStore idempotencyStore,
    IOrderPaymentCoordinator orderPaymentCoordinator,
    IEmailSender emailSender,
    IClock clock,
    ILogger<ProcessPaymentWebhookCommandHandler> logger) : IRequestHandler<ProcessPaymentWebhookCommand, Unit>
{
    public async Task<Unit> Handle(ProcessPaymentWebhookCommand request, CancellationToken ct)
    {
        var parsed = paymentGateway.TryParseWebhook(request.RawPayload, request.SignatureHeader);
        if (parsed is null)
        {
            // Logged, not raised as a domain event — there is no aggregate to raise it from (the
            // signature never verified, so nothing about this payload can be trusted enough to
            // correlate to a real Payment). See docs/32_COMMERCE_EVENT_CATALOG.md's own note.
            logger.LogWarning("Rejected a payment webhook with an invalid signature");
            throw new InvalidWebhookSignatureException();
        }

        var isNewEvent = await idempotencyStore.TryReserveAsync(parsed.ProviderEventId, ct);
        if (!isNewEvent)
        {
            logger.LogInformation("Ignored a duplicate/replayed webhook event {ProviderEventId}", parsed.ProviderEventId);
            return Unit.Value;
        }

        var payment = await paymentRepository.GetByOrderIdAsync(parsed.OrderId, ct);
        if (payment is null)
        {
            logger.LogWarning("Received a webhook for order {OrderId} with no matching Payment", parsed.OrderId);
            return Unit.Value;
        }

        var now = clock.UtcNow;
        payment.RecordWebhookReceived(parsed.ProviderEventId, parsed.EventType, now);

        // Already resolved by ConfirmPaymentCommand (or an earlier delivery of this same event,
        // though that path is already closed by the idempotency-store check above) — a safe,
        // expected no-op, never re-applied.
        if (payment.Status != PaymentStatus.Processing)
        {
            return Unit.Value;
        }

        var attempt = payment.CurrentAttempt!;
        if (attempt.ProviderReference!.Value != parsed.ProviderReference)
        {
            // A webhook for a stale attempt (e.g. arriving after a retry already started a new
            // one) — never applied against the wrong attempt.
            return Unit.Value;
        }

        if (parsed.Outcome.Succeeded && parsed.Outcome.RequiresCapture)
        {
            // Two-phase (CaptureMode: "Manual") — see ConfirmPaymentCommand's own identical
            // branch, including why the attempt's own Started-only guard here (idempotent
            // against a redelivered/duplicate-event-id-but-still-Processing webhook).
            if (attempt.Status == PaymentAttemptStatus.Started)
            {
                payment.AuthorizeAttempt(attempt.Id, now);
            }
        }
        else if (parsed.Outcome.Succeeded)
        {
            var method = parsed.Outcome.MethodType is null ? null : PaymentMethod.Create(parsed.Outcome.MethodType, parsed.Outcome.MethodBrand, parsed.Outcome.MethodLast4);
            payment.CaptureAttempt(attempt.Id, method, now);
            await orderPaymentCoordinator.OnPaymentSucceededAsync(payment.OrderId, now, ct);

            // The real reason this command's own doc comment can claim "the browser closed
            // right after confirming is recoverable" — if this webhook is what actually resolved
            // the payment (ConfirmPaymentCommand's own optimistic call never reached the server,
            // or never returned), the customer still needs their confirmation email; nothing else
            // sends it. Same fire-and-forget, CancellationToken.None discipline as
            // ConfirmPaymentCommand's own identical send — a gateway webhook delivery has no real
            // "client" to abort on in the first place, but the reasoning is the same: this must
            // not block the webhook's own response, and must not be cancelled by anything.
            var order = await orderRepository.GetByIdAsync(payment.OrderId, ct);
            if (order is not null)
            {
                var email = order.GuestInfo?.Email ?? (order.CustomerId is Guid customerId ? (await userRepository.GetByIdAsync(customerId, ct))?.Email.Value : null);
                if (email is not null)
                {
                    _ = emailSender.SendOrderConfirmationAsync(email, order.OrderNumber.Value, order.Totals.Total.Amount, CancellationToken.None);
                }
            }
        }
        else if (parsed.Outcome.IsProviderError)
        {
            payment.ErrorAttempt(attempt.Id, PaymentFailure.Create(parsed.Outcome.FailureCode ?? "provider_error", parsed.Outcome.FailureMessage ?? "The payment gateway returned an unexpected error.", parsed.Outcome.DeclineCode), now);
        }
        else
        {
            payment.DeclineAttempt(attempt.Id, PaymentFailure.Create(parsed.Outcome.FailureCode ?? "card_declined", parsed.Outcome.FailureMessage ?? "Your card was declined.", parsed.Outcome.DeclineCode), now);
        }

        return Unit.Value;
    }
}
