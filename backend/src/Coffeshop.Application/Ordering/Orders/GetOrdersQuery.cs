using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Dtos;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Ordering.Mapping;
using MediatR;

namespace Coffeshop.Application.Ordering.Orders;

/// <summary>GET /api/v1/admin/orders — every order, every status, admin/staff-only (`Permission.ViewOrders`, enforced at the endpoint). This sprint's own "AdminOrders" query, per the Phase 2 brief — a filtered call into the same `GetPagedAsync` `GetMyOrdersQuery` uses, not a second repository method.</summary>
public sealed record GetOrdersQuery(OrderFilter Filter, OrderSortBy SortBy, PageRequest Page) : IQuery<PagedResult<OrderSummaryDto>>;

internal sealed class GetOrdersQueryHandler(IOrderRepository orderRepository)
    : IRequestHandler<GetOrdersQuery, PagedResult<OrderSummaryDto>>
{
    public async Task<PagedResult<OrderSummaryDto>> Handle(GetOrdersQuery request, CancellationToken ct)
    {
        var (items, totalCount) = await orderRepository.GetPagedAsync(request.Filter, request.SortBy, request.Page.SkipCount, request.Page.ClampedPageSize, ct);
        return new PagedResult<OrderSummaryDto>([.. items.Select(o => o.ToSummaryDto())], request.Page.Page, request.Page.ClampedPageSize, totalCount);
    }
}
