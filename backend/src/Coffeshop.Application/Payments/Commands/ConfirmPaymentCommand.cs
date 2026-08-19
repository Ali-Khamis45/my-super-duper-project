using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Payments.Coordination;
using Coffeshop.Application.Payments.Dtos;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Application.Payments.Mapping;
using Coffeshop.Domain.Payments;
using Coffeshop.Domain.Payments.Exceptions;
using Coffeshop.Domain.Payments.ValueObjects;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Payments.Commands;

/// <summary>
/// The customer-facing "I just confirmed with the gateway's client-side SDK, check the real
/// result" call — re-fetches the *actual* current status from <see cref="IPaymentGateway"/>
/// rather than trusting anything the client claims, the same "server always recomputes, never
/// trusts the client" discipline <c>CreateOrderFromCartCommand</c> already applies to pricing.
/// The real webhook (<c>ProcessPaymentWebhookCommand</c>) is the authoritative backstop for the
/// exact same outcome — both paths are fully idempotent and converge on the same
/// <see cref="Payment"/> state regardless of which one "wins" the race (see this sprint's own
/// review for the concurrency verification).
///
/// Idempotent by design against a real "Refresh during checkout" / "Double-click checkout": a
/// <see cref="Payment"/> already <see cref="PaymentStatus.Succeeded"/> returns its current state
/// as a safe no-op rather than erroring — the second confirm-call after a page refresh is a
/// normal, expected input, not an exceptional one.
/// </summary>
public sealed record ConfirmPaymentCommand(Guid PaymentId) : ICommand<PaymentDto>;

public sealed class ConfirmPaymentCommandValidator : AbstractValidator<ConfirmPaymentCommand>
{
    public ConfirmPaymentCommandValidator() => RuleFor(x => x.PaymentId).NotEmpty();
}

internal sealed class ConfirmPaymentCommandHandler(
    IPaymentRepository paymentRepository,
    IOrderRepository orderRepository,
    IUserRepository userRepository,
    IPaymentGateway paymentGateway,
    IOrderPaymentCoordinator orderPaymentCoordinator,
    IEmailSender emailSender,
    IClock clock) : IRequestHandler<ConfirmPaymentCommand, PaymentDto>
{
    public async Task<PaymentDto> Handle(ConfirmPaymentCommand request, CancellationToken ct)
    {
        var payment = await paymentRepository.GetByIdAsync(request.PaymentId, ct) ?? throw new PaymentNotFoundException();
        var order = await orderRepository.GetByIdAsync(payment.OrderId, ct);

        if (payment.Status == PaymentStatus.Succeeded)
        {
            return payment.ToDto(order?.OrderNumber.Value);
        }

        if (payment.Status != PaymentStatus.Processing)
        {
            throw new InvalidPaymentStatusException($"A payment in '{payment.Status}' status has nothing to confirm.");
        }

        var attempt = payment.CurrentAttempt!;
        var now = clock.UtcNow;
        var outcome = await paymentGateway.GetStatusAsync(attempt.ProviderReference!.Value, ct);

        if (outcome.Succeeded && outcome.RequiresCapture)
        {
            // Two-phase (CaptureMode: "Manual") — the card is approved but the order is not paid
            // yet; Payment stays Processing until the real, explicit CapturePaymentCommand runs.
            // No confirmation email here — sending "your order is confirmed" before money has
            // actually moved would be a real, user-visible lie. Idempotent against a second
            // confirm/webhook for the same already-authorized attempt (Payment.Status alone
            // can't short-circuit this the way it does for the auto-capture branch, since it's
            // still Processing) — a repeat call is a safe no-op, not a re-authorize attempt.
            if (attempt.Status == PaymentAttemptStatus.Started)
            {
                payment.AuthorizeAttempt(attempt.Id, now);
            }
        }
        else if (outcome.Succeeded)
        {
            var method = outcome.MethodType is null ? null : PaymentMethod.Create(outcome.MethodType, outcome.MethodBrand, outcome.MethodLast4);
            payment.CaptureAttempt(attempt.Id, method, now);
            await orderPaymentCoordinator.OnPaymentSucceededAsync(payment.OrderId, now, ct);

            if (order is not null)
            {
                // A guest order's own GuestOrderInfo already carries a real email; an
                // authenticated customer's doesn't live on Order at all (never denormalized
                // there), so it's resolved from Identity here — the same cross-context
                // repository-lookup precedent InventoryReservationDto.OrderNumber already
                // established for a real display/notification need.
                var email = order.GuestInfo?.Email ?? (order.CustomerId is Guid customerId ? (await userRepository.GetByIdAsync(customerId, ct))?.Email.Value : null);
                if (email is not null)
                {
                    // Deliberately not awaited, and deliberately CancellationToken.None, not
                    // `ct` — a real, live-verified Sprint 5.5 bug: awaiting a full SMTP round
                    // trip inline blocked this customer-facing response long enough that a real
                    // browser (observed under Playwright, concurrent-load conditions) aborted
                    // the request before ever seeing the "payment succeeded" response, even
                    // though the capture itself had already committed. The email is a real,
                    // best-effort side effect (SmtpEmailSender.SendAsync already catches and
                    // logs every failure internally, never throws) — it must not gate how fast
                    // the customer learns their payment succeeded, and must not be cancelled
                    // merely because that customer's connection dropped.
                    _ = emailSender.SendOrderConfirmationAsync(email, order.OrderNumber.Value, order.Totals.Total.Amount, CancellationToken.None);
                }
            }
        }
        else if (outcome.IsProviderError)
        {
            payment.ErrorAttempt(attempt.Id, PaymentFailure.Create(outcome.FailureCode ?? "provider_error", outcome.FailureMessage ?? "The payment gateway returned an unexpected error.", outcome.DeclineCode), now);
        }
        else
        {
            payment.DeclineAttempt(attempt.Id, PaymentFailure.Create(outcome.FailureCode ?? "card_declined", outcome.FailureMessage ?? "Your card was declined.", outcome.DeclineCode), now);
        }

        return payment.ToDto(order?.OrderNumber.Value);
    }
}
