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

/// <summary>Reverses a manual <see cref="MarkOutOfStockCommand"/> override — see <c>InventoryItem.MarkAvailable</c>'s own doc comment for why this re-derives status rather than forcing it. Admin-only (<c>PermissionCodes.AdjustInventory</c>, enforced at the endpoint).</summary>
public sealed record MarkAvailableCommand(Guid InventoryItemId) : ICommand<InventoryItemDto>;

public sealed class MarkAvailableCommandValidator : AbstractValidator<MarkAvailableCommand>
{
    public MarkAvailableCommandValidator() => RuleFor(x => x.InventoryItemId).NotEmpty();
}

internal sealed class MarkAvailableCommandHandler(
    IInventoryItemRepository inventoryItemRepository,
    IIngredientRepository ingredientRepository,
    IClock clock) : IRequestHandler<MarkAvailableCommand, InventoryItemDto>
{
    public async Task<InventoryItemDto> Handle(MarkAvailableCommand request, CancellationToken ct)
    {
        var item = await inventoryItemRepository.GetByIdAsync(request.InventoryItemId, ct) ?? throw new InventoryItemNotFoundException();
        var ingredient = await ingredientRepository.GetByIdAsync(item.IngredientId, ct) ?? throw new IngredientNotFoundException();

        item.MarkAvailable(clock.UtcNow);

        return item.ToDto(ingredient);
    }
}
