using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Payments.Dtos;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Application.Payments.Mapping;
using Coffeshop.Domain.Catalog.ValueObjects;
using Coffeshop.Domain.Payments.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Payments.Commands;

/// <summary>
/// Admin-only (<c>PermissionCodes.ProcessRefunds</c> — already frozen in Phase 0, seeded to
/// <c>Admin</c> only, never <c>Staff</c>; reused as-is, not redefined). Deliberately never
/// touches the owning <c>Order</c>'s own status — a served drink isn't "un-served" by a refund,
/// so <c>Order</c> stays <c>Completed</c>/<c>Paid</c> exactly as it already is; only
/// <see cref="Domain.Payments.Payment.RefundedAmount"/>/<see cref="Domain.Payments.PaymentStatus"/>
/// change. <see cref="Amount"/> is optional — omitted means a full refund of whatever remains
/// unrefunded, the common case; a real partial-refund UI passes an explicit smaller amount.
/// </summary>
public sealed record RefundPaymentCommand(Guid PaymentId, decimal? Amount, string? Reason) : ICommand<PaymentDto>;

public sealed class RefundPaymentCommandValidator : AbstractValidator<RefundPaymentCommand>
{
    public RefundPaymentCommandValidator()
    {
        RuleFor(x => x.PaymentId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0).When(x => x.Amount is not null);
    }
}

internal sealed class RefundPaymentCommandHandler(
    IPaymentRepository paymentRepository,
    IOrderRepository orderRepository,
    IPaymentGateway paymentGateway,
    IClock clock) : IRequestHandler<RefundPaymentCommand, PaymentDto>
{
    public async Task<PaymentDto> Handle(RefundPaymentCommand request, CancellationToken ct)
    {
        var payment = await paymentRepository.GetByIdAsync(request.PaymentId, ct) ?? throw new PaymentNotFoundException();
        var attempt = payment.Attempts.LastOrDefault(a => a.Status == Domain.Payments.PaymentAttemptStatus.Captured)
            ?? throw new InvalidPaymentStatusException("This payment has no captured attempt to refund.");

        var remaining = payment.Amount.Subtract(payment.RefundedAmount);
        var refundAmount = request.Amount ?? remaining.Amount;

        var outcome = await paymentGateway.RefundAsync(attempt.ProviderReference!.Value, refundAmount, payment.Amount.Currency, ct);
        if (!outcome.Succeeded)
        {
            throw new InvalidRefundAmountException(outcome.FailureMessage ?? "The gateway rejected this refund.");
        }

        payment.Refund(Money.Create(refundAmount, payment.Amount.Currency), request.Reason, clock.UtcNow);

        var order = await orderRepository.GetByIdAsync(payment.OrderId, ct);
        return payment.ToDto(order?.OrderNumber.Value);
    }
}
