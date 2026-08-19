using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Payments.Dtos;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Domain.Ordering;
using Coffeshop.Domain.Ordering.Exceptions;
using Coffeshop.Domain.Payments;
using Coffeshop.Domain.Payments.ValueObjects;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Payments.Commands;

/// <summary>
/// The real backing for both this sprint's brief-named <c>CreateCheckoutSession</c> *and*
/// <c>StartPayment</c> — deliberately one real command, not two. A first call against a
/// <c>Submitted</c> order with no <see cref="Payment"/> yet creates one and starts its first
/// attempt; a call against an existing, still-<see cref="PaymentStatus.Pending"/> payment (one or
/// more prior declined/errored/timed-out attempts) starts a new attempt — the real "Retry
/// payment" action, requiring no separate endpoint. A call against a still-<see cref="PaymentStatus.Processing"/>
/// payment (an attempt already in flight) is a real, live-verified idempotent no-op — it returns
/// the *existing* attempt's session info rather than calling the gateway a second time, which is
/// exactly what this sprint's own Phase 10 "double-click checkout" verification case needs to be
/// safe.
///
/// `AllowAnonymous` at the endpoint, matching <c>CreateOrderFromCartCommand</c>'s own precedent —
/// a guest checkout has no account to authenticate as, and the checkout page only ever knows an
/// <see cref="OrderId"/> because it just created that exact order in the same browser session.
/// </summary>
public sealed record CreateCheckoutSessionCommand(Guid OrderId) : ICommand<PaymentSessionDto>;

public sealed class CreateCheckoutSessionCommandValidator : AbstractValidator<CreateCheckoutSessionCommand>
{
    public CreateCheckoutSessionCommandValidator() => RuleFor(x => x.OrderId).NotEmpty();
}

internal sealed class CreateCheckoutSessionCommandHandler(
    IPaymentRepository paymentRepository,
    IOrderRepository orderRepository,
    IPaymentGateway paymentGateway,
    ICurrentUserService currentUserService,
    IClock clock) : IRequestHandler<CreateCheckoutSessionCommand, PaymentSessionDto>
{
    public async Task<PaymentSessionDto> Handle(CreateCheckoutSessionCommand request, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(request.OrderId, ct) ?? throw new OrderNotFoundException();

        // Same ownership rule CancelOrderCommand/GetOrderQuery already established: a real
        // customer can only ever act on their own order; a guest order (no CustomerId) has no
        // owner to check against, since the checkout page's only real credential is having just
        // created it in this same browser session.
        if (order.CustomerId is not null && order.CustomerId != currentUserService.UserId)
        {
            throw new OrderNotFoundException();
        }

        if (order.Status != OrderStatus.Submitted)
        {
            throw new InvalidOrderStatusTransitionException($"An order in '{order.Status}' status cannot start a checkout session.");
        }

        var now = clock.UtcNow;
        var payment = await paymentRepository.GetByOrderIdAsync(order.Id, ct);

        if (payment is not null && payment.Status == PaymentStatus.Processing)
        {
            // A genuine double-click / duplicate request while an attempt is already in flight —
            // return the existing attempt's session info rather than calling the gateway again.
            var current = payment.CurrentAttempt!;
            return new PaymentSessionDto(payment.Id, current.Id, payment.Provider.ToString().ToLowerInvariant(), null, null, current.Status.ToString().ToLowerInvariant());
        }

        if (payment is null)
        {
            // The active gateway's own Provider — resolved once via DI (Payments:Provider config,
            // see Coffeshop.Infrastructure's registration), never hardcoded here.
            payment = Payment.Create(order.Id, order.Totals.Total, paymentGateway.Provider, IdempotencyKey.Create($"order-{order.Id}"), now);
            paymentRepository.Add(payment);
        }

        // A distinct gateway idempotency key per attempt (not per payment) — a real retry after a
        // decline must reach the gateway as a genuinely new charge attempt, while a duplicate
        // request at the *same* attempt number (the double-click case above) would reuse it and
        // get the gateway's own cached response back, never a second real charge.
        var attemptNumber = payment.Attempts.Count + 1;
        var gatewayIdempotencyKey = $"{payment.IdempotencyKey.Value}-attempt-{attemptNumber}";

        var intent = await paymentGateway.CreateIntentAsync(order.Id, payment.Amount.Amount, payment.Amount.Currency, gatewayIdempotencyKey, ct);
        var attempt = payment.StartAttempt(PaymentProviderReference.Create(intent.ProviderReference), now);

        return new PaymentSessionDto(payment.Id, attempt.Id, payment.Provider.ToString().ToLowerInvariant(), intent.ClientSecret, intent.PublishableKey, attempt.Status.ToString().ToLowerInvariant());
    }
}
