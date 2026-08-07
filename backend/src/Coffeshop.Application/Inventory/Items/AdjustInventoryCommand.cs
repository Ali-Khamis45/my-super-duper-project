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

/// <summary>A manual staff correction against a physical count/spoilage/breakage — <see cref="Delta"/> is signed (negative shrinks stock). Admin-only (<c>PermissionCodes.AdjustInventory</c>, enforced at the endpoint).</summary>
public sealed record AdjustInventoryCommand(Guid InventoryItemId, int Delta, string Reason) : ICommand<InventoryItemDto>;

public sealed class AdjustInventoryCommandValidator : AbstractValidator<AdjustInventoryCommand>
{
    public AdjustInventoryCommandValidator()
    {
        RuleFor(x => x.InventoryItemId).NotEmpty();
        RuleFor(x => x.Delta).NotEqual(0);
        RuleFor(x => x.Reason).NotEmpty().MaximumLength(500);
    }
}

internal sealed class AdjustInventoryCommandHandler(
    IInventoryItemRepository inventoryItemRepository,
    IInventoryTransactionRepository inventoryTransactionRepository,
    IIngredientRepository ingredientRepository,
    IClock clock) : IRequestHandler<AdjustInventoryCommand, InventoryItemDto>
{
    public async Task<InventoryItemDto> Handle(AdjustInventoryCommand request, CancellationToken ct)
    {
        var item = await inventoryItemRepository.GetByIdAsync(request.InventoryItemId, ct) ?? throw new InventoryItemNotFoundException();
        var ingredient = await ingredientRepository.GetByIdAsync(item.IngredientId, ct) ?? throw new IngredientNotFoundException();

        var transaction = item.Adjust(request.Delta, request.Reason, clock.UtcNow);
        inventoryTransactionRepository.Add(transaction);

        return item.ToDto(ingredient);
    }
}
