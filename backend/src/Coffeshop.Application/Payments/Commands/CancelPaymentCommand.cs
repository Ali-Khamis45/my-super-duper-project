using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Payments.Coordination;
using Coffeshop.Application.Payments.Dtos;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Application.Payments.Mapping;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Payments.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Payments.Commands;

/// <summary>
/// The customer/staff explicitly gives up on this checkout — distinct from a single declined
/// attempt (which <c>Payment.DeclineAttempt</c> already keeps retryable without ever reaching
/// this command). Calls <c>IOrderPaymentCoordinator.OnPaymentAbandonedAsync</c>, which maps onto
/// the existing, unmodified <c>Order.Fail</c> — the real "this submitted order couldn't be paid"
/// outcome, per that method's own Sprint 5.3 doc comment.
/// </summary>
public sealed record CancelPaymentCommand(Guid PaymentId, string? Reason) : ICommand<PaymentDto>;

public sealed class CancelPaymentCommandValidator : AbstractValidator<CancelPaymentCommand>
{
    public CancelPaymentCommandValidator() => RuleFor(x => x.PaymentId).NotEmpty();
}

internal sealed class CancelPaymentCommandHandler(
    IPaymentRepository paymentRepository,
    IOrderRepository orderRepository,
    IOrderPaymentCoordinator orderPaymentCoordinator,
    ICurrentUserService currentUserService,
    IClock clock) : IRequestHandler<CancelPaymentCommand, PaymentDto>
{
    public async Task<PaymentDto> Handle(CancelPaymentCommand request, CancellationToken ct)
    {
        var payment = await paymentRepository.GetByIdAsync(request.PaymentId, ct) ?? throw new PaymentNotFoundException();
        var order = await orderRepository.GetByIdAsync(payment.OrderId, ct);

        // Same ownership-or-staff rule CancelOrderCommand already established.
        var isOwner = order?.CustomerId is not null && order.CustomerId == currentUserService.UserId;
        var isStaff = currentUserService.Permissions.Contains(PermissionCodes.UpdateOrderStatus);
        var isGuestOrder = order?.CustomerId is null;
        if (!isOwner && !isStaff && !isGuestOrder)
        {
            throw new PaymentNotFoundException();
        }

        var now = clock.UtcNow;
        payment.Cancel(now);
        await orderPaymentCoordinator.OnPaymentAbandonedAsync(payment.OrderId, request.Reason ?? "Checkout cancelled.", now, ct);

        return payment.ToDto(order?.OrderNumber.Value);
    }
}
