using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Inventory.Dtos;
using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Application.Inventory.Mapping;
using MediatR;

namespace Coffeshop.Application.Inventory.Items;

/// <summary>GET /api/v1/admin/inventory — admin-only (<c>PermissionCodes.ViewInventory</c>, enforced at the endpoint). <c>LowStockReportQuery</c>/<c>OutOfStockProductsQuery</c> are thin, status-preset callers of the same <see cref="IInventoryItemRepository.GetPagedAsync"/> this query uses, matching <c>GetOrdersQuery</c>/<c>GetMyOrdersQuery</c>'s own "different query classes, one shared repository method" precedent.</summary>
public sealed record GetInventoryQuery(InventoryItemFilter Filter, InventoryItemSortBy SortBy, PageRequest Page) : IQuery<PagedResult<InventoryItemSummaryDto>>;

internal sealed class GetInventoryQueryHandler(IInventoryItemRepository inventoryItemRepository, IIngredientRepository ingredientRepository)
    : IRequestHandler<GetInventoryQuery, PagedResult<InventoryItemSummaryDto>>
{
    public async Task<PagedResult<InventoryItemSummaryDto>> Handle(GetInventoryQuery request, CancellationToken ct)
    {
        var (items, totalCount) = await inventoryItemRepository.GetPagedAsync(request.Filter, request.SortBy, request.Page.SkipCount, request.Page.ClampedPageSize, ct);
        var ingredientsById = (await ingredientRepository.GetAllAsync(ct)).ToDictionary(i => i.Id);

        return new PagedResult<InventoryItemSummaryDto>(
            [.. items.Select(item => item.ToSummaryDto(ingredientsById[item.IngredientId]))],
            request.Page.Page,
            request.Page.ClampedPageSize,
            totalCount);
    }
}
