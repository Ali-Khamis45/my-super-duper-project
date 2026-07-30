using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using MediatR;

namespace Coffeshop.Application.Catalog.Ingredients;

/// <summary>GET /api/v1/ingredients.</summary>
public sealed record GetIngredientsQuery : IQuery<IReadOnlyList<IngredientDto>>;

internal sealed class GetIngredientsQueryHandler(IIngredientRepository ingredientRepository)
    : IRequestHandler<GetIngredientsQuery, IReadOnlyList<IngredientDto>>
{
    public async Task<IReadOnlyList<IngredientDto>> Handle(GetIngredientsQuery request, CancellationToken cancellationToken)
    {
        var ingredients = await ingredientRepository.GetAllAsync(cancellationToken);
        var categoryCodes = await ingredientRepository.GetCategoryCodesAsync(cancellationToken);

        return [.. ingredients
            .OrderBy(i => i.SortOrder)
            .Select(i => i.ToDto(categoryCodes.GetValueOrDefault(i.IngredientCategoryId, "")))];
    }
}

/// <summary>GET /api/v1/ingredients/{code}.</summary>
public sealed record GetIngredientQuery(string Code) : IQuery<IngredientDto>;

internal sealed class GetIngredientQueryHandler(IIngredientRepository ingredientRepository)
    : IRequestHandler<GetIngredientQuery, IngredientDto>
{
    public async Task<IngredientDto> Handle(GetIngredientQuery request, CancellationToken cancellationToken)
    {
        var ingredient = await ingredientRepository.GetByCodeAsync(request.Code, cancellationToken)
            ?? throw new IngredientNotFoundException();

        var categoryCodes = await ingredientRepository.GetCategoryCodesAsync(cancellationToken);
        return ingredient.ToDto(categoryCodes.GetValueOrDefault(ingredient.IngredientCategoryId, ""));
    }
}
