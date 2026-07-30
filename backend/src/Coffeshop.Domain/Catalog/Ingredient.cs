using Coffeshop.Domain.Catalog.Events;
using Coffeshop.Domain.Catalog.ValueObjects;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Catalog;

/// <summary>
/// Per docs/30_COMMERCE_DDD_MODEL.md's Catalog context — a standalone aggregate root, separate
/// from <see cref="Product"/> and <see cref="Category"/> (explicitly not a god-aggregate).
/// References <see cref="IngredientCategory"/> and <see cref="Category"/> (for compatibility)
/// only by id/code, never by navigation, since those are conceptually separate aggregates.
/// </summary>
public sealed class Ingredient : AuditableEntity<Guid>
{
    private readonly List<string> _compatibleCategoryCodes = [];

    public string Code { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public Guid IngredientCategoryId { get; private set; }

    public Money PriceModifier { get; private set; } = null!;

    /// <summary>When true, <see cref="CompatibleCategoryCodes"/> is ignored — compatible with every product category, matching the frontend's <c>compatibleWith: "all"</c> sentinel.</summary>
    public bool IsUniversallyCompatible { get; private set; }

    public IReadOnlyCollection<string> CompatibleCategoryCodes => _compatibleCategoryCodes.AsReadOnly();

    public string Color { get; private set; } = null!;

    public IngredientShape Shape { get; private set; }

    public int SortOrder { get; private set; }

    private Ingredient()
    {
    }

    public static Ingredient Create(
        string code,
        string name,
        Guid ingredientCategoryId,
        Money priceModifier,
        IReadOnlyCollection<string> compatibleCategoryCodes,
        bool isUniversallyCompatible,
        string color,
        IngredientShape shape,
        int sortOrder)
    {
        var ingredient = new Ingredient
        {
            Id = Guid.NewGuid(),
            Code = code.Trim().ToLowerInvariant(),
            Name = name.Trim(),
            IngredientCategoryId = ingredientCategoryId,
            PriceModifier = priceModifier,
            IsUniversallyCompatible = isUniversallyCompatible,
            Color = color,
            Shape = shape,
            SortOrder = sortOrder,
        };

        ingredient._compatibleCategoryCodes.AddRange(compatibleCategoryCodes.Select(c => c.Trim().ToLowerInvariant()).Distinct());
        ingredient.AddDomainEvent(new IngredientCreatedEvent(ingredient.Id, ingredient.Code, ingredient.Name));
        return ingredient;
    }

    public void UpdateDetails(string name, Money priceModifier, string color, int sortOrder)
    {
        Name = name.Trim();
        PriceModifier = priceModifier;
        Color = color;
        SortOrder = sortOrder;
        AddDomainEvent(new IngredientUpdatedEvent(Id));
    }

    public void UpdateCompatibility(IReadOnlyCollection<string> compatibleCategoryCodes, bool isUniversallyCompatible)
    {
        _compatibleCategoryCodes.Clear();
        _compatibleCategoryCodes.AddRange(compatibleCategoryCodes.Select(c => c.Trim().ToLowerInvariant()).Distinct());
        IsUniversallyCompatible = isUniversallyCompatible;
        AddDomainEvent(new IngredientUpdatedEvent(Id));
    }

    public bool IsCompatibleWith(string categoryCode) =>
        IsUniversallyCompatible || _compatibleCategoryCodes.Contains(categoryCode.Trim().ToLowerInvariant());
}
