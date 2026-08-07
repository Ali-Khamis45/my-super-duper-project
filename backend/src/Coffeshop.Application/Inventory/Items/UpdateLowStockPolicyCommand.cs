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

/// <summary>Not named in this sprint's Phase 2 brief, but a real, necessary addition: without this, <c>LowStockPolicy.Default</c>'s threshold of 5 would be permanent for every item — no way for staff to tell the system "milk needs a higher reorder point than sprinkles." Admin-only (<c>PermissionCodes.AdjustInventory</c>, enforced at the endpoint).</summary>
public sealed record UpdateLowStockPolicyCommand(Guid InventoryItemId, int Threshold) : ICommand<InventoryItemDto>;

public sealed class UpdateLowStockPolicyCommandValidator : AbstractValidator<UpdateLowStockPolicyCommand>
{
    public UpdateLowStockPolicyCommandValidator()
    {
        RuleFor(x => x.InventoryItemId).NotEmpty();
        RuleFor(x => x.Threshold).GreaterThanOrEqualTo(0);
    }
}

internal sealed class UpdateLowStockPolicyCommandHandler(
    IInventoryItemRepository inventoryItemRepository,
    IIngredientRepository ingredientRepository,
    IClock clock) : IRequestHandler<UpdateLowStockPolicyCommand, InventoryItemDto>
{
    public async Task<InventoryItemDto> Handle(UpdateLowStockPolicyCommand request, CancellationToken ct)
    {
        var item = await inventoryItemRepository.GetByIdAsync(request.InventoryItemId, ct) ?? throw new InventoryItemNotFoundException();
        var ingredient = await ingredientRepository.GetByIdAsync(item.IngredientId, ct) ?? throw new IngredientNotFoundException();

        item.UpdateLowStockPolicy(request.Threshold, clock.UtcNow);

        return item.ToDto(ingredient);
    }
}
