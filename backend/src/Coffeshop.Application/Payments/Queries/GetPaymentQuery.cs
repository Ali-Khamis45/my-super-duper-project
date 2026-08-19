using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Payments.Dtos;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Application.Payments.Mapping;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Payments.Exceptions;
using MediatR;

namespace Coffeshop.Application.Payments.Queries;

/// <summary>GET /api/v1/payments/{id} — same ownership-or-staff-permission check as <c>GetOrderQuery</c>, for the identical reason (a customer must never be able to read another customer's payment by guessing/incrementing an id).</summary>
public sealed record GetPaymentQuery(Guid PaymentId) : IQuery<PaymentDto>;

internal sealed class GetPaymentQueryHandler(IPaymentRepository paymentRepository, IOrderRepository orderRepository, ICurrentUserService currentUserService)
    : IRequestHandler<GetPaymentQuery, PaymentDto>
{
    public async Task<PaymentDto> Handle(GetPaymentQuery request, CancellationToken ct)
    {
        var payment = await paymentRepository.GetByIdAsync(request.PaymentId, ct) ?? throw new PaymentNotFoundException();
        var order = await orderRepository.GetByIdAsync(payment.OrderId, ct);

        var isOwner = order?.CustomerId is not null && order.CustomerId == currentUserService.UserId;
        var isStaff = currentUserService.Permissions.Contains(PermissionCodes.ViewPayments);
        var isGuestOrder = order?.CustomerId is null;
        if (!isOwner && !isStaff && !isGuestOrder)
        {
            throw new PaymentNotFoundException();
        }

        return payment.ToDto(order?.OrderNumber.Value);
    }
}
