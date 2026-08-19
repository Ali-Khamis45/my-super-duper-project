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
/// The real, explicit capture step for a two-phase authorize-then-capture flow — distinct from
/// the primary checkout path (<c>ConfirmPaymentCommand</c>), which uses automatic capture
/// end to end (the simplest real UX for an instant coffee-shop checkout, and what
/// <c>FakePaymentGateway</c>'s default mode simulates). This command is real, tested,
/// admin-reachable functionality for the genuine authorize-only mode both gateways also support
/// (<c>FakePaymentGateway</c>'s explicit authorize-only flag; Stripe's real <c>capture_method: manual</c>) —
/// not speculative surface with no caller: an authorize-only attempt is only ever
/// <see cref="PaymentAttemptStatus.Authorized"/>, never <see cref="PaymentAttemptStatus.Captured"/>,
/// until this command runs. Admin-only (<c>PermissionCodes.ProcessRefunds</c>, enforced at the
/// endpoint — the same permission already governing the other money-moving admin action).
/// </summary>
public sealed record CapturePaymentCommand(Guid PaymentId) : ICommand<PaymentDto>;

public sealed class CapturePaymentCommandValidator : AbstractValidator<CapturePaymentCommand>
{
    public CapturePaymentCommandValidator() => RuleFor(x => x.PaymentId).NotEmpty();
}

internal sealed class CapturePaymentCommandHandler(
    IPaymentRepository paymentRepository,
    IOrderRepository orderRepository,
    IPaymentGateway paymentGateway,
    IOrderPaymentCoordinator orderPaymentCoordinator,
    IClock clock) : IRequestHandler<CapturePaymentCommand, PaymentDto>
{
    public async Task<PaymentDto> Handle(CapturePaymentCommand request, CancellationToken ct)
    {
        var payment = await paymentRepository.GetByIdAsync(request.PaymentId, ct) ?? throw new PaymentNotFoundException();
        var attempt = payment.CurrentAttempt;

        if (attempt is null || attempt.Status != PaymentAttemptStatus.Authorized)
        {
            throw new InvalidPaymentStatusException("Only an authorized (not yet captured) attempt can be explicitly captured.");
        }

        var now = clock.UtcNow;
        var outcome = await paymentGateway.CaptureAsync(attempt.ProviderReference!.Value, ct);

        if (!outcome.Succeeded)
        {
            payment.ErrorAttempt(attempt.Id, PaymentFailure.Create(outcome.FailureCode ?? "capture_failed", outcome.FailureMessage ?? "Capture failed.", outcome.DeclineCode), now);
            return payment.ToDto((await orderRepository.GetByIdAsync(payment.OrderId, ct))?.OrderNumber.Value);
        }

        var method = outcome.MethodType is null ? null : PaymentMethod.Create(outcome.MethodType, outcome.MethodBrand, outcome.MethodLast4);
        payment.CaptureAttempt(attempt.Id, method, now);
        await orderPaymentCoordinator.OnPaymentSucceededAsync(payment.OrderId, now, ct);

        var order = await orderRepository.GetByIdAsync(payment.OrderId, ct);
        return payment.ToDto(order?.OrderNumber.Value);
    }
}
