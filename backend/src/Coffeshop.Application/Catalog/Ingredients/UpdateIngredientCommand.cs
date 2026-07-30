using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Catalog.ValueObjects;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Catalog.Ingredients;

/// <summary>The sprint brief's "UpdateIngredients" command — Ingredient is its own aggregate root (docs/30_COMMERCE_DDD_MODEL.md), so this targets one Ingredient by code, not a Product-owned list (Product has no ingredient list to update; compatibility is category-wide, per the frontend's own `isIngredientCompatible` check).</summary>
public sealed record UpdateIngredientCommand(
    string Code,
    string Name,
    decimal PriceModifier,
    string Color,
    int SortOrder,
    IReadOnlyCollection<string> CompatibleCategoryCodes,
    bool IsUniversallyCompatible) : ICommand<IngredientDto>;

public sealed class UpdateIngredientCommandValidator : AbstractValidator<UpdateIngredientCommand>
{
    public UpdateIngredientCommandValidator()
    {
        RuleFor(x => x.Code).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.PriceModifier).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Color).NotEmpty().MaximumLength(20);
    }
}

internal sealed class UpdateIngredientCommandHandler(IIngredientRepository ingredientRepository)
    : IRequestHandler<UpdateIngredientCommand, IngredientDto>
{
    public async Task<IngredientDto> Handle(UpdateIngredientCommand request, CancellationToken cancellationToken)
    {
        var ingredient = await ingredientRepository.GetByCodeAsync(request.Code, cancellationToken)
            ?? throw new IngredientNotFoundException();

        ingredient.UpdateDetails(request.Name, Money.Create(request.PriceModifier), request.Color, request.SortOrder);
        ingredient.UpdateCompatibility(request.CompatibleCategoryCodes, request.IsUniversallyCompatible);

        var categoryCodes = await ingredientRepository.GetCategoryCodesAsync(cancellationToken);
        return ingredient.ToDto(categoryCodes.GetValueOrDefault(ingredient.IngredientCategoryId, ""));
    }
}
