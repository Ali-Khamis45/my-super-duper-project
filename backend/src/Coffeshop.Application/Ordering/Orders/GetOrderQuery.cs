using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Dtos;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Ordering.Mapping;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Ordering.Exceptions;
using MediatR;

namespace Coffeshop.Application.Ordering.Orders;

/// <summary>GET /api/v1/orders/{id} — same ownership-or-staff-permission check as <see cref="CancelOrderCommand"/>, for the identical reason (a customer must never be able to read another customer's order by guessing/incrementing an id).</summary>
public sealed record GetOrderQuery(Guid OrderId) : IQuery<OrderDto>;

internal sealed class GetOrderQueryHandler(IOrderRepository orderRepository, ICurrentUserService currentUserService)
    : IRequestHandler<GetOrderQuery, OrderDto>
{
    public async Task<OrderDto> Handle(GetOrderQuery request, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(request.OrderId, ct) ?? throw new OrderNotFoundException();

        var isOwner = order.CustomerId is not null && order.CustomerId == currentUserService.UserId;
        var isStaff = currentUserService.Permissions.Contains(PermissionCodes.ViewOrders);
        if (!isOwner && !isStaff)
        {
            throw new OrderNotFoundException();
        }

        return order.ToDto();
    }
}
