using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Inventory.Dtos;
using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Application.Inventory.Mapping;
using Coffeshop.Domain.Inventory;
using MediatR;

namespace Coffeshop.Application.Inventory.Items;

/// <summary>
/// Named "OutOfStockProducts" in this sprint's own brief, but returns out-of-stock
/// <b>ingredients</b> (<see cref="InventoryItemSummaryDto"/>), not products — <see cref="InventoryItem"/>
/// tracks ingredients, never a finished <c>Product</c>, per this project's own frozen Inventory
/// scope decision (see <c>InventoryItem</c>'s own doc comment). A real <c>Product</c>-level
/// "what's actually orderable right now" view would need to cross-reference every product's
/// possible ingredient combinations against this data — no such projection exists in Catalog
/// today, and building one here would be exactly the fabricated bill-of-materials data this
/// sprint's own domain design explicitly refused to invent. Admin-only
/// (<c>PermissionCodes.ViewInventory</c>, enforced at the endpoint).
/// </summary>
public sealed record OutOfStockProductsQuery(PageRequest Page) : IQuery<PagedResult<InventoryItemSummaryDto>>;

internal sealed class OutOfStockProductsQueryHandler(IInventoryItemRepository inventoryItemRepository, IIngredientRepository ingredientRepository)
    : IRequestHandler<OutOfStockProductsQuery, PagedResult<InventoryItemSummaryDto>>
{
    public async Task<PagedResult<InventoryItemSummaryDto>> Handle(OutOfStockProductsQuery request, CancellationToken ct)
    {
        var filter = new InventoryItemFilter(Status: InventoryStatus.OutOfStock);
        var (items, totalCount) = await inventoryItemRepository.GetPagedAsync(filter, InventoryItemSortBy.NameAsc, request.Page.SkipCount, request.Page.ClampedPageSize, ct);
        var ingredientsById = (await ingredientRepository.GetAllAsync(ct)).ToDictionary(i => i.Id);

        return new PagedResult<InventoryItemSummaryDto>(
            [.. items.Select(item => item.ToSummaryDto(ingredientsById[item.IngredientId]))],
            request.Page.Page,
            request.Page.ClampedPageSize,
            totalCount);
    }
}
