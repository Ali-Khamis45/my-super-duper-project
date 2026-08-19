using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Inventory.Coordination;
using Coffeshop.Application.Ordering.Dtos;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Ordering.Mapping;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Domain.Ordering.Exceptions;
using Coffeshop.Domain.Payments;
using Coffeshop.Domain.Payments.Exceptions;
using MediatR;

namespace Coffeshop.Application.Ordering.Orders;

/// <summary>
/// Admin/staff-only (`Permission.UpdateOrderStatus`, enforced at the endpoint) — records that
/// payment was received through some means outside the real gateway this sprint's Payments
/// Platform now provides (cash, an in-person card reader). Kept as a real, separate capability
/// rather than folded into Payments — a real, small coffee shop takes cash at the counter, and
/// that order never had (and never will have) a <c>Payment</c> aggregate at all.
///
/// Guards against a real, live-verified Sprint 5.5 finding: a customer can start a real card
/// checkout (<c>Payment</c> created, <c>Processing</c>) in one tab while staff, unaware,
/// records the same order paid by cash here — without this guard, the card capture that
/// resolves afterward would still succeed at the gateway (charging the customer for real) even
/// though <c>Order.MarkPaid</c> then throws (the order is already <c>Paid</c>), a genuine
/// double-charge with no automatic remediation. Blocking here, before the order is marked paid
/// by any means, is cheaper and safer than trying to reconcile it after the fact.
/// </summary>
public sealed record PayOrderCommand(Guid OrderId) : ICommand<OrderDto>;

internal sealed class PayOrderCommandHandler(
    IOrderRepository orderRepository,
    IPaymentRepository paymentRepository,
    IInventoryReservationCoordinator inventoryReservationCoordinator,
    IClock clock)
    : IRequestHandler<PayOrderCommand, OrderDto>
{
    public async Task<OrderDto> Handle(PayOrderCommand request, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(request.OrderId, ct) ?? throw new OrderNotFoundException();

        var existingPayment = await paymentRepository.GetByOrderIdAsync(order.Id, ct);
        if (existingPayment is not null && existingPayment.Status is PaymentStatus.Pending or PaymentStatus.Processing)
        {
            throw new PaymentInProgressException();
        }

        var now = clock.UtcNow;
        order.MarkPaid(now);

        // The one real moment stock actually leaves the building, per this sprint's own brief:
        // "Consumption occurs only after successful payment (not before)." Converts every active
        // reservation into a permanent InventoryTransaction debit.
        await inventoryReservationCoordinator.ConsumeForOrderAsync(order.Id, now, ct);

        return order.ToDto();
    }
}
