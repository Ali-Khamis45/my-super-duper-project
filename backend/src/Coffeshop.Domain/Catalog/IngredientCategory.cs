using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Catalog;

/// <summary>
/// A lightweight reference entity, not a full aggregate root with its own repository — mirrors
/// <c>Permission</c>'s role in the Identity context (docs/30_COMMERCE_DDD_MODEL.md). Matches
/// the frontend's <c>IngredientCategoryId</c> union exactly (<c>"foam"</c>, <c>"cream"</c>,
/// <c>"chocolate"</c>, <c>"caramel"</c>, <c>"cinnamon"</c>, <c>"sprinkles"</c>, <c>"ice"</c>,
/// <c>"milk"</c>, <c>"syrup"</c>). Kept as its own type distinct from <see cref="Ingredient"/>'s
/// own <c>Code</c> specifically so a future second ingredient in the same category (e.g. a
/// second syrup flavor) is a new <see cref="Ingredient"/> under an existing category, never a
/// new category — the exact distinction the frontend's own `data/ingredients.ts` comment
/// already names as the reason `Ingredient.id` and `IngredientCategoryId` are separate types.
/// </summary>
public sealed class IngredientCategory : Entity<Guid>
{
    public string Code { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    private IngredientCategory()
    {
    }

    public static IngredientCategory Create(string code, string name) =>
        new()
        {
            Id = Guid.NewGuid(),
            Code = code.Trim().ToLowerInvariant(),
            Name = name.Trim(),
        };
}
