using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Catalog.ValueObjects;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Catalog.Ingredients;

public sealed record CreateIngredientCommand(
    string Code,
    string Name,
    Guid IngredientCategoryId,
    decimal PriceModifier,
    IReadOnlyCollection<string> CompatibleCategoryCodes,
    bool IsUniversallyCompatible,
    string Color,
    string Shape,
    int SortOrder) : ICommand<IngredientDto>;

public sealed class CreateIngredientCommandValidator : AbstractValidator<CreateIngredientCommand>
{
    public CreateIngredientCommandValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(40).Matches("^[a-z0-9-]+$");
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.IngredientCategoryId).NotEmpty();
        RuleFor(x => x.PriceModifier).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Color).NotEmpty().MaximumLength(20);
        RuleFor(x => x.Shape).Must(s => Enum.TryParse<IngredientShape>(s, true, out _))
            .WithMessage("Shape must be one of: Ring, Sprinkles, Ice.");
    }
}

internal sealed class CreateIngredientCommandHandler(IIngredientRepository ingredientRepository)
    : IRequestHandler<CreateIngredientCommand, IngredientDto>
{
    public async Task<IngredientDto> Handle(CreateIngredientCommand request, CancellationToken cancellationToken)
    {
        var code = request.Code.Trim().ToLowerInvariant();

        if (await ingredientRepository.ExistsByCodeAsync(code, cancellationToken))
        {
            throw new IngredientAlreadyExistsException(code);
        }

        var categoryCodes = await ingredientRepository.GetCategoryCodesAsync(cancellationToken);
        if (!categoryCodes.ContainsKey(request.IngredientCategoryId))
        {
            throw new IngredientCategoryNotFoundException();
        }

        var ingredient = Ingredient.Create(
            code,
            request.Name,
            request.IngredientCategoryId,
            Money.Create(request.PriceModifier),
            request.CompatibleCategoryCodes,
            request.IsUniversallyCompatible,
            request.Color,
            Enum.Parse<IngredientShape>(request.Shape, true),
            request.SortOrder);

        ingredientRepository.Add(ingredient);

        return ingredient.ToDto(categoryCodes[ingredient.IngredientCategoryId]);
    }
}
