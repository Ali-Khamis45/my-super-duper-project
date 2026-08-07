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

/// <summary>Staff recording new stock arriving from a supplier — admin-only (<c>PermissionCodes.AdjustInventory</c>, enforced at the endpoint).</summary>
public sealed record RestockInventoryCommand(Guid InventoryItemId, int Quantity, string? Note) : ICommand<InventoryItemDto>;

public sealed class RestockInventoryCommandValidator : AbstractValidator<RestockInventoryCommand>
{
    public RestockInventoryCommandValidator()
    {
        RuleFor(x => x.InventoryItemId).NotEmpty();
        RuleFor(x => x.Quantity).GreaterThan(0);
        RuleFor(x => x.Note).MaximumLength(500);
    }
}

internal sealed class RestockInventoryCommandHandler(
    IInventoryItemRepository inventoryItemRepository,
    IInventoryTransactionRepository inventoryTransactionRepository,
    IIngredientRepository ingredientRepository,
    IClock clock) : IRequestHandler<RestockInventoryCommand, InventoryItemDto>
{
    public async Task<InventoryItemDto> Handle(RestockInventoryCommand request, CancellationToken ct)
    {
        var item = await inventoryItemRepository.GetByIdAsync(request.InventoryItemId, ct) ?? throw new InventoryItemNotFoundException();
        var ingredient = await ingredientRepository.GetByIdAsync(item.IngredientId, ct) ?? throw new IngredientNotFoundException();

        var transaction = item.Restock(request.Quantity, clock.UtcNow, request.Note);
        inventoryTransactionRepository.Add(transaction);

        return item.ToDto(ingredient);
    }
}
