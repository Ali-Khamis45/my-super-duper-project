using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Inventory.Dtos;
using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Application.Inventory.Mapping;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Inventory.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Inventory.Items;

/// <summary>An explicit staff override forcing <c>OutOfStock</c> ahead of the real balance — see <c>InventoryItem.MarkOutOfStock</c>'s own doc comment. Admin-only (<c>PermissionCodes.AdjustInventory</c>, enforced at the endpoint).</summary>
public sealed record MarkOutOfStockCommand(Guid InventoryItemId) : ICommand<InventoryItemDto>;

public sealed class MarkOutOfStockCommandValidator : AbstractValidator<MarkOutOfStockCommand>
{
    public MarkOutOfStockCommandValidator() => RuleFor(x => x.InventoryItemId).NotEmpty();
}

internal sealed class MarkOutOfStockCommandHandler(
    IInventoryItemRepository inventoryItemRepository,
    IIngredientRepository ingredientRepository,
    IClock clock) : IRequestHandler<MarkOutOfStockCommand, InventoryItemDto>
{
    public async Task<InventoryItemDto> Handle(MarkOutOfStockCommand request, CancellationToken ct)
    {
        var item = await inventoryItemRepository.GetByIdAsync(request.InventoryItemId, ct) ?? throw new InventoryItemNotFoundException();
        var ingredient = await ingredientRepository.GetByIdAsync(item.IngredientId, ct) ?? throw new IngredientNotFoundException();

        item.MarkOutOfStock(clock.UtcNow);

        return item.ToDto(ingredient);
    }
}
