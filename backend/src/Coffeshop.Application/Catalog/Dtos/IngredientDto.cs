namespace Coffeshop.Application.Catalog.Dtos;

/// <summary>
/// Per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md's DTO tracing table — matches the frontend's
/// `Ingredient` type field-for-field (`id, name, category, priceModifier, compatibleWith,
/// color, shape`); `icon` (a Lucide component reference) stays frontend-only, never
/// serialized, exactly as that table already specified. `Id`/`Category` here are the stable
/// string codes (`Ingredient.Code`/`IngredientCategory.Code`), not database Guids — the
/// frontend's own `Ingredient.id`/`category` fields are strings, and this DTO's job is to be
/// that exact shape, not to leak an internal surrogate key the frontend never asked for.
///
/// <c>SortOrder</c> is additive beyond that frontend-tracing table (Sprint 5.2, Phase 7): a real
/// gap found building the admin ingredient editor — <c>UpdateIngredientCommand</c> requires
/// <c>SortOrder</c> on every call, but nothing previously exposed the current value, which would
/// have forced any real caller to silently reset it on every edit.
/// </summary>
public sealed record IngredientDto(
    string Id,
    string Name,
    string Category,
    decimal PriceModifier,
    object CompatibleWith,
    string Color,
    string Shape,
    int SortOrder);
