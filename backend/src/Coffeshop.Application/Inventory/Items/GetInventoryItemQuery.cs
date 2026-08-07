using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Inventory.Dtos;
using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Application.Inventory.Mapping;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Inventory.Exceptions;
using MediatR;

namespace Coffeshop.Application.Inventory.Items;

/// <summary>GET /api/v1/admin/inventory/{id} — admin-only (<c>PermissionCodes.ViewInventory</c>, enforced at the endpoint).</summary>
public sealed record GetInventoryItemQuery(Guid InventoryItemId) : IQuery<InventoryItemDto>;

internal sealed class GetInventoryItemQueryHandler(IInventoryItemRepository inventoryItemRepository, IIngredientRepository ingredientRepository)
    : IRequestHandler<GetInventoryItemQuery, InventoryItemDto>
{
    public async Task<InventoryItemDto> Handle(GetInventoryItemQuery request, CancellationToken ct)
    {
        var item = await inventoryItemRepository.GetByIdAsync(request.InventoryItemId, ct) ?? throw new InventoryItemNotFoundException();
        var ingredient = await ingredientRepository.GetByIdAsync(item.IngredientId, ct) ?? throw new IngredientNotFoundException();

        return item.ToDto(ingredient);
    }
}
