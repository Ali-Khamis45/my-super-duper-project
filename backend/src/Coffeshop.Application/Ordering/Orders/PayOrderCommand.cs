using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Dtos;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Ordering.Mapping;
using Coffeshop.Domain.Ordering.Exceptions;
using MediatR;

namespace Coffeshop.Application.Ordering.Orders;

/// <summary>
/// Admin/staff-only (`Permission.UpdateOrderStatus`, enforced at the endpoint) — this sprint has
/// no real payment gateway (no `Payment` aggregate, no `IPaymentProvider`; this brief's Phase 1
/// list has no such thing either), so "pay" here means what it means at a real, small coffee
/// shop's own point of sale: staff records that payment was actually received (cash, an
/// in-person card reader outside this system, etc.), not a card-number form this project has
/// nothing real to submit it to. A fake "enter your card" UI backed by nothing would be exactly
/// the placeholder implementation this sprint's brief forbids.
/// </summary>
public sealed record PayOrderCommand(Guid OrderId) : ICommand<OrderDto>;

internal sealed class PayOrderCommandHandler(IOrderRepository orderRepository, IClock clock)
    : IRequestHandler<PayOrderCommand, OrderDto>
{
    public async Task<OrderDto> Handle(PayOrderCommand request, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(request.OrderId, ct) ?? throw new OrderNotFoundException();
        order.MarkPaid(clock.UtcNow);
        return order.ToDto();
    }
}
