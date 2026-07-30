namespace Coffeshop.Api.Endpoints.Catalog;

public sealed record CreateProductRequest(
    string Sku,
    string Name,
    string CategoryCode,
    decimal Price,
    decimal? CompareAtPrice,
    string Tagline,
    string Description,
    IReadOnlyCollection<string> Tags,
    string Season,
    string Temperature,
    string Type);

public sealed record UpdateProductRequest(string Name, string Tagline, string Description, IReadOnlyCollection<string> Tags);

public sealed record UpdatePricingRequest(decimal Price, decimal? CompareAtPrice);

public sealed record AssignCategoryRequest(string CategoryCode);

public sealed record UpdateAvailabilityRequest(bool IsAvailable);

public sealed record SetFeaturedRequest(bool IsFeatured);

public sealed record AddImageRequest(string Url, string? AltText, bool IsPrimary);

public sealed record CreateCategoryRequest(string Code, string Name, int SortOrder);

public sealed record UpdateCategoryRequest(string Name, int SortOrder);

public sealed record CreateIngredientRequest(
    string Code,
    string Name,
    Guid IngredientCategoryId,
    decimal PriceModifier,
    IReadOnlyCollection<string> CompatibleCategoryCodes,
    bool IsUniversallyCompatible,
    string Color,
    string Shape,
    int SortOrder);

public sealed record UpdateIngredientRequest(
    string Name,
    decimal PriceModifier,
    string Color,
    int SortOrder,
    IReadOnlyCollection<string> CompatibleCategoryCodes,
    bool IsUniversallyCompatible);
