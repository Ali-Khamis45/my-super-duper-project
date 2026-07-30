using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Dtos;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Ordering.Mapping;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Ordering.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Ordering.Orders;

/// <summary>
/// A single command serves both self-service (the order's own customer) and admin cancellation
/// — <c>POST /api/v1/orders/{id}/cancel</c> is one real endpoint, not a customer-facing one plus
/// a duplicate `/admin/orders/{id}/cancel`, per this sprint's own Phase 4 endpoint list. The
/// authorization split that a single static `[Authorize(Policy = ...)]` can't express (customer
/// owns *this* order vs. staff/admin can cancel *any* order) is resolved inside the handler,
/// using the additive <c>ICurrentUserService.Permissions</c>. Guest orders are not cancellable
/// through this endpoint — there is no account to authenticate as, and building a real
/// lookup-by-order-number-and-email flow for guest self-service cancellation has no real
/// frontend caller yet; a guest who needs to cancel goes through an admin, the same as any real
/// coffee shop's actual guest-order-support process.
/// </summary>
public sealed record CancelOrderCommand(Guid OrderId, string? Reason) : ICommand<OrderDto>;

public sealed class CancelOrderCommandValidator : AbstractValidator<CancelOrderCommand>
{
    public CancelOrderCommandValidator()
    {
        RuleFor(x => x.OrderId).NotEmpty();
    }
}

internal sealed class CancelOrderCommandHandler(IOrderRepository orderRepository, ICurrentUserService currentUserService, IClock clock)
    : IRequestHandler<CancelOrderCommand, OrderDto>
{
    public async Task<OrderDto> Handle(CancelOrderCommand request, CancellationToken ct)
    {
        var order = await orderRepository.GetByIdAsync(request.OrderId, ct) ?? throw new OrderNotFoundException();

        var isOwner = order.CustomerId is not null && order.CustomerId == currentUserService.UserId;
        var isStaff = currentUserService.Permissions.Contains(PermissionCodes.UpdateOrderStatus);
        if (!isOwner && !isStaff)
        {
            throw new OrderNotFoundException(); // Deliberately the same "not found" a real owner-check miss gets — never confirms an order id exists to a caller who has no business knowing that.
        }

        order.Cancel(clock.UtcNow, request.Reason);
        return order.ToDto();
    }
}
