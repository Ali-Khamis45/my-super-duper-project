namespace Coffeshop.Application.Catalog.Dtos;

public sealed record ProductVariantDto(Guid Id, string Name, decimal PriceAdjustment, int SortOrder);

public sealed record ProductImageDto(Guid Id, string Url, string? AltText, bool IsPrimary, int SortOrder);

public sealed record NutritionFactsDto(int? Calories, int? CaffeineMg, int? SugarGrams);

/// <summary>
/// Per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md's DTO tracing table — `id, name, category,
/// price, tagline, description, tags` match the frontend's `Drink` type field-for-field
/// exactly (so `resolveDrink()`'s callers need zero shape changes, only a data-source swap).
/// Every other field is additive, backend-only surface no existing frontend code reads yet.
/// `Category` is the stable string code (`"espresso"`), matching `Drink.category`'s own type —
/// never the internal `CategoryId` Guid.
/// </summary>
public sealed record ProductDto(
    Guid Id,
    string Sku,
    string Name,
    string Category,
    decimal Price,
    decimal? CompareAtPrice,
    string Tagline,
    string Description,
    IReadOnlyCollection<string> Tags,
    string Status,
    bool IsAvailable,
    string Season,
    string Temperature,
    string Type,
    NutritionFactsDto? Nutrition,
    IReadOnlyCollection<ProductVariantDto> Variants,
    IReadOnlyCollection<ProductImageDto> Images);

/// <summary>
/// A lighter-weight shape for list/search results — no variants/images/nutrition payload,
/// matching `SearchProductsQuery`'s `PagedResult&lt;ProductSummaryDto&gt;` shape
/// (docs/31_COMMERCE_ENGINEERING_CONTRACTS.md). <c>Description</c> is included (unlike
/// variants/images) because the existing frontend's `Drink` type — and its
/// `DrinkDetailDialog` — requires it for every item in the menu list it already renders;
/// omitting it would have forced a second per-item fetch the current UI has no use for.
/// </summary>
public sealed record ProductSummaryDto(
    Guid Id,
    string Sku,
    string Name,
    string Category,
    decimal Price,
    decimal? CompareAtPrice,
    string Tagline,
    string Description,
    IReadOnlyCollection<string> Tags,
    string Status,
    bool IsAvailable,
    string Season,
    string Temperature);
