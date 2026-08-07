using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Inventory.Dtos;
using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Application.Inventory.Mapping;
using Coffeshop.Domain.Inventory;
using MediatR;

namespace Coffeshop.Application.Inventory.Items;

/// <summary>GET /api/v1/admin/inventory?status=lowStock's named counterpart — a status-preset caller of <see cref="IInventoryItemRepository.GetPagedAsync"/>, per <c>GetInventoryQuery</c>'s own doc comment. Admin-only (<c>PermissionCodes.ViewInventory</c>, enforced at the endpoint).</summary>
public sealed record LowStockReportQuery(PageRequest Page) : IQuery<PagedResult<InventoryItemSummaryDto>>;

internal sealed class LowStockReportQueryHandler(IInventoryItemRepository inventoryItemRepository, IIngredientRepository ingredientRepository)
    : IRequestHandler<LowStockReportQuery, PagedResult<InventoryItemSummaryDto>>
{
    public async Task<PagedResult<InventoryItemSummaryDto>> Handle(LowStockReportQuery request, CancellationToken ct)
    {
        var filter = new InventoryItemFilter(Status: InventoryStatus.LowStock);
        var (items, totalCount) = await inventoryItemRepository.GetPagedAsync(filter, InventoryItemSortBy.StockAscending, request.Page.SkipCount, request.Page.ClampedPageSize, ct);
        var ingredientsById = (await ingredientRepository.GetAllAsync(ct)).ToDictionary(i => i.Id);

        return new PagedResult<InventoryItemSummaryDto>(
            [.. items.Select(item => item.ToSummaryDto(ingredientsById[item.IngredientId]))],
            request.Page.Page,
            request.Page.ClampedPageSize,
            totalCount);
    }
}
