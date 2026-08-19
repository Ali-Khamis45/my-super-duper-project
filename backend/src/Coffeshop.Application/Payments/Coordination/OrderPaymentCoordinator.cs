using Coffeshop.Application.Inventory.Coordination;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Domain.Ordering.Exceptions;

namespace Coffeshop.Application.Payments.Coordination;

internal sealed class OrderPaymentCoordinator(IOrderRepository orderRepository, IInventoryReservationCoordinator inventoryReservationCoordinator) : IOrderPaymentCoordinator
{
    public async Task OnPaymentSucceededAsync(Guid orderId, DateTimeOffset nowUtc, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(orderId, ct) ?? throw new OrderNotFoundException();
        order.MarkPaid(nowUtc);
        await inventoryReservationCoordinator.ConsumeForOrderAsync(orderId, nowUtc, ct);
    }

    public async Task OnPaymentAbandonedAsync(Guid orderId, string reason, DateTimeOffset nowUtc, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(orderId, ct) ?? throw new OrderNotFoundException();
        order.Fail(nowUtc, reason);
        await inventoryReservationCoordinator.ReleaseForOrderAsync(orderId, nowUtc, ct);
    }
}
