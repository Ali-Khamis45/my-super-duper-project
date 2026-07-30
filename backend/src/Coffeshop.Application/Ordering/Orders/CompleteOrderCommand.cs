using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Dtos;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Ordering.Mapping;
using Coffeshop.Domain.Ordering.Exceptions;
using MediatR;

namespace Coffeshop.Application.Ordering.Orders;

/// <summary>Admin/staff-only — the order has been picked up (this business's one real fulfillment method, per `FulfillmentMethod.Pickup`'s own doc comment).</summary>
public sealed record CompleteOrderCommand(Guid OrderId) : ICommand<OrderDto>;

internal sealed class CompleteOrderCommandHandler(IOrderRepository orderRepository, IClock clock)
    : IRequestHandler<CompleteOrderCommand, OrderDto>
{
    public async Task<OrderDto> Handle(CompleteOrderCommand request, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(request.OrderId, ct) ?? throw new OrderNotFoundException();
        order.MarkCompleted(clock.UtcNow);
        return order.ToDto();
    }
}
