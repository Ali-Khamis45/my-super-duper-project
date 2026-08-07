using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Inventory.Dtos;
using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Application.Inventory.Mapping;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Inventory;
using Coffeshop.Domain.Inventory.Exceptions;
using Coffeshop.Domain.Inventory.ValueObjects;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Inventory.Items;

/// <summary>
/// Not named in this sprint's Phase 2 brief, but a real, necessary addition: nothing else in the
/// system can create the first <see cref="InventoryItem"/> row for an ingredient — stock tracking
/// is opted into per-ingredient (see <see cref="InventoryItem"/>'s own scope-decision doc
/// comment), a real Sprint 5.4 rollout choice, not an automatic side effect of
/// <c>CreateIngredientCommand</c> (which this sprint's Zero Rewrite Policy forbids touching
/// anyway). Admin-only (<c>PermissionCodes.AdjustInventory</c>, enforced at the endpoint).
/// </summary>
public sealed record CreateInventoryItemCommand(Guid IngredientId, int InitialStock, int? LowStockThreshold) : ICommand<InventoryItemDto>;

public sealed class CreateInventoryItemCommandValidator : AbstractValidator<CreateInventoryItemCommand>
{
    public CreateInventoryItemCommandValidator()
    {
        RuleFor(x => x.IngredientId).NotEmpty();
        RuleFor(x => x.InitialStock).GreaterThanOrEqualTo(0);
        RuleFor(x => x.LowStockThreshold).GreaterThanOrEqualTo(0).When(x => x.LowStockThreshold is not null);
    }
}

internal sealed class CreateInventoryItemCommandHandler(
    IInventoryItemRepository inventoryItemRepository,
    IIngredientRepository ingredientRepository,
    IClock clock) : IRequestHandler<CreateInventoryItemCommand, InventoryItemDto>
{
    public async Task<InventoryItemDto> Handle(CreateInventoryItemCommand request, CancellationToken ct)
    {
        var ingredient = await ingredientRepository.GetByIdAsync(request.IngredientId, ct) ?? throw new IngredientNotFoundException();

        if (await inventoryItemRepository.ExistsByIngredientIdAsync(request.IngredientId, ct))
        {
            throw new InventoryItemAlreadyExistsException();
        }

        var policy = request.LowStockThreshold is int threshold ? LowStockPolicy.Create(threshold) : null;
        var item = InventoryItem.Create(request.IngredientId, request.InitialStock, clock.UtcNow, policy);
        inventoryItemRepository.Add(item);

        return item.ToDto(ingredient);
    }
}
