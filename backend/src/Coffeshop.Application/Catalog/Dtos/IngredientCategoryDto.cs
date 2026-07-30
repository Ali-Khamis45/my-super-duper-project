namespace Coffeshop.Application.Catalog.Dtos;

/// <summary>
/// The lightweight reference entity itself, real <c>Guid</c> included — distinct from
/// <see cref="IngredientDto"/>'s own <c>Category</c> (a stable string code, no Guid exposed)
/// because <c>CreateIngredientCommand</c> genuinely needs the Guid to assign a new
/// <see cref="Coffeshop.Domain.Catalog.Ingredient"/> to an existing category; nothing about the
/// public-facing <see cref="IngredientDto"/> shape changes.
/// </summary>
public sealed record IngredientCategoryDto(Guid Id, string Code, string Name);
