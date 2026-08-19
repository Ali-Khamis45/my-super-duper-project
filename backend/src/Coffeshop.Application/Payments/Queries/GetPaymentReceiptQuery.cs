using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Payments.Dtos;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Payments;
using Coffeshop.Domain.Payments.Exceptions;
using MediatR;

namespace Coffeshop.Application.Payments.Queries;

/// <summary>GET /api/v1/payments/{id}/receipt — composed live from the real, already-immutable <c>Payment</c>+<c>Order</c> data; see <c>PaymentReceiptDto</c>'s own doc comment for why nothing is separately stored/generated. Same ownership-or-staff check as <c>GetPaymentQuery</c>. Only meaningful for a <see cref="PaymentStatus.Succeeded"/>/<see cref="PaymentStatus.Refunded"/>/<see cref="PaymentStatus.PartiallyRefunded"/> payment — anything else has never actually captured, so there is no real receipt to show yet.</summary>
public sealed record GetPaymentReceiptQuery(Guid PaymentId) : IQuery<PaymentReceiptDto>;

internal sealed class GetPaymentReceiptQueryHandler(IPaymentRepository paymentRepository, IOrderRepository orderRepository, ICurrentUserService currentUserService)
    : IRequestHandler<GetPaymentReceiptQuery, PaymentReceiptDto>
{
    public async Task<PaymentReceiptDto> Handle(GetPaymentReceiptQuery request, CancellationToken ct)
    {
        var payment = await paymentRepository.GetByIdAsync(request.PaymentId, ct) ?? throw new PaymentNotFoundException();

        if (payment.Status is not (PaymentStatus.Succeeded or PaymentStatus.Refunded or PaymentStatus.PartiallyRefunded))
        {
            throw new InvalidPaymentStatusException($"A payment in '{payment.Status}' status has no receipt yet.");
        }

        var order = await orderRepository.GetByIdAsync(payment.OrderId, ct) ?? throw new PaymentNotFoundException();

        var isOwner = order.CustomerId is not null && order.CustomerId == currentUserService.UserId;
        var isStaff = currentUserService.Permissions.Contains(PermissionCodes.ViewPayments);
        var isGuestOrder = order.CustomerId is null;
        if (!isOwner && !isStaff && !isGuestOrder)
        {
            throw new PaymentNotFoundException();
        }

        var capturedAttempt = payment.Attempts.LastOrDefault(a => a.Status == PaymentAttemptStatus.Captured);

        return new PaymentReceiptDto(
            payment.Id,
            order.OrderNumber.Value,
            payment.Amount.Amount,
            payment.Amount.Currency,
            capturedAttempt?.Method?.ToString(),
            capturedAttempt?.ResolvedAtUtc,
            [.. order.Items.Select(i => new Dtos.PaymentReceiptLineDto(i.ProductName, i.Quantity, i.LineTotal.Amount))]);
    }
}
