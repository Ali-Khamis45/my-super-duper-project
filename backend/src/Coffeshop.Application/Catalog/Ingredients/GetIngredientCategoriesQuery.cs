using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Messaging;
using MediatR;

namespace Coffeshop.Application.Catalog.Ingredients;

/// <summary>GET /api/v1/ingredient-categories — the real Guids `CreateIngredientCommand.IngredientCategoryId` requires, otherwise undiscoverable through any endpoint.</summary>
public sealed record GetIngredientCategoriesQuery : IQuery<IReadOnlyList<IngredientCategoryDto>>;

internal sealed class GetIngredientCategoriesQueryHandler(IIngredientRepository ingredientRepository)
    : IRequestHandler<GetIngredientCategoriesQuery, IReadOnlyList<IngredientCategoryDto>>
{
    public async Task<IReadOnlyList<IngredientCategoryDto>> Handle(GetIngredientCategoriesQuery request, CancellationToken cancellationToken)
    {
        var categories = await ingredientRepository.GetCategoriesAsync(cancellationToken);
        return [.. categories.Select(c => new IngredientCategoryDto(c.Id, c.Code, c.Name))];
    }
}
