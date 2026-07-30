using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Dtos;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Ordering.Mapping;
using MediatR;

namespace Coffeshop.Application.Ordering.Orders;

/// <summary>
/// GET /api/v1/orders/me — the authenticated customer's own order history ("GetMyOrders"/
/// "OrderHistory" from the Phase 2 brief; the same underlying data, one query, not two). Guest
/// orders are deliberately excluded from any "my orders" concept — there is no account for a
/// guest order to belong to; a guest's only real record of their order is the confirmation page
/// and the receipt email, matching real guest-checkout UX everywhere.
/// </summary>
public sealed record GetMyOrdersQuery(PageRequest Page) : IQuery<PagedResult<OrderSummaryDto>>;

internal sealed class GetMyOrdersQueryHandler(IOrderRepository orderRepository, ICurrentUserService currentUserService)
    : IRequestHandler<GetMyOrdersQuery, PagedResult<OrderSummaryDto>>
{
    public async Task<PagedResult<OrderSummaryDto>> Handle(GetMyOrdersQuery request, CancellationToken ct)
    {
        var customerId = currentUserService.UserId!.Value; // Endpoint requires authentication — never reached anonymously.
        var filter = new OrderFilter(CustomerId: customerId);
        var (items, totalCount) = await orderRepository.GetPagedAsync(filter, OrderSortBy.Newest, request.Page.SkipCount, request.Page.ClampedPageSize, ct);
        return new PagedResult<OrderSummaryDto>([.. items.Select(o => o.ToSummaryDto())], request.Page.Page, request.Page.ClampedPageSize, totalCount);
    }
}
