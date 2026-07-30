namespace Coffeshop.Domain.Catalog;

/// <summary>A product's publication lifecycle — independent of <c>Product.IsAvailable</c> (real-time orderability, e.g. temporarily sold out), per Sprint 5.2's own Phase 7 "Draft / Published" admin requirement.</summary>
public enum ProductStatus
{
    Draft,
    Published,
    Archived,
}

/// <summary>
/// Deliberately a single member today — the current catalog is 100% beverages
/// (docs/milestone-5-commerce-rfc.md's seed-data strategy traces every product back to
/// `features/menu/data/drinks.ts`, all drinks). The enum exists so a future product type
/// (Food, Merchandise, GiftCard) is a new member, never a schema change — not built further
/// than that single real member, since no second type has a named requirement yet.
/// </summary>
public enum ProductType
{
    Beverage,
}

public enum Season
{
    AllYear,
    Spring,
    Summer,
    Fall,
    Winter,
}

public enum Temperature
{
    Hot,
    Iced,
    Both,
}

/// <summary>Which registered hero-cup part renders this ingredient — matches the frontend's own `IngredientShape` union exactly (`features/composer/types.ts`), field-for-field.</summary>
public enum IngredientShape
{
    Ring,
    Sprinkles,
    Ice,
}
