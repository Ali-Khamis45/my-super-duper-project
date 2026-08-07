using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Inventory.Coordination;
using Coffeshop.Application.Ordering.Dtos;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Ordering.Mapping;
using Coffeshop.Domain.Ordering.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Ordering.Orders;

/// <summary>Admin/staff-only — records that a submitted order couldn't be paid (e.g. an in-person payment attempt failed). Distinct from `Cancel`: this is "we tried and it didn't work," not a choice to abandon the order.</summary>
public sealed record FailOrderCommand(Guid OrderId, string Reason) : ICommand<OrderDto>;

public sealed class FailOrderCommandValidator : AbstractValidator<FailOrderCommand>
{
    public FailOrderCommandValidator()
    {
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}

internal sealed class FailOrderCommandHandler(
    IOrderRepository orderRepository,
    IInventoryReservationCoordinator inventoryReservationCoordinator,
    IClock clock)
    : IRequestHandler<FailOrderCommand, OrderDto>
{
    public async Task<OrderDto> Handle(FailOrderCommand request, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(request.OrderId, ct) ?? throw new OrderNotFoundException();

        var now = clock.UtcNow;
        order.Fail(now, request.Reason);

        // Payment didn't go through — release, not consume, the same as cancellation.
        await inventoryReservationCoordinator.ReleaseForOrderAsync(order.Id, now, ct);

        return order.ToDto();
    }
}
