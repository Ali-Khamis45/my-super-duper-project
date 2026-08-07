using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Inventory.Dtos;
using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Application.Inventory.Mapping;
using MediatR;

namespace Coffeshop.Application.Inventory.Items;

/// <summary>GET /api/v1/admin/inventory/history — the append-only <c>InventoryTransaction</c> ledger, optionally scoped to one item. Admin-only (<c>PermissionCodes.ViewInventory</c>, enforced at the endpoint).</summary>
public sealed record InventoryHistoryQuery(InventoryTransactionFilter Filter, PageRequest Page) : IQuery<PagedResult<InventoryTransactionDto>>;

internal sealed class InventoryHistoryQueryHandler(IInventoryTransactionRepository inventoryTransactionRepository, IIngredientRepository ingredientRepository)
    : IRequestHandler<InventoryHistoryQuery, PagedResult<InventoryTransactionDto>>
{
    public async Task<PagedResult<InventoryTransactionDto>> Handle(InventoryHistoryQuery request, CancellationToken ct)
    {
        var (items, totalCount) = await inventoryTransactionRepository.GetPagedAsync(request.Filter, request.Page.SkipCount, request.Page.ClampedPageSize, ct);
        var ingredientsById = (await ingredientRepository.GetAllAsync(ct)).ToDictionary(i => i.Id);

        return new PagedResult<InventoryTransactionDto>(
            [.. items.Select(t => t.ToDto(ingredientsById[t.IngredientId]))],
            request.Page.Page,
            request.Page.ClampedPageSize,
            totalCount);
    }
}
