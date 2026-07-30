using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Domain.Catalog;

namespace Coffeshop.Application.Catalog.Mapping;

/// <summary>Hand-written mapping, deliberately not a reflection-based mapper — per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's DTO mapping rules.</summary>
public static class CatalogMappingExtensions
{
    public static CategoryDto ToDto(this Category category) =>
        new(category.Id, category.Code, category.Name, category.SortOrder);

    public static IngredientDto ToDto(this Ingredient ingredient, string categoryCode)
    {
        object compatibleWith = ingredient.IsUniversallyCompatible
            ? "all"
            : ingredient.CompatibleCategoryCodes.ToArray();

        return new IngredientDto(
            ingredient.Code,
            ingredient.Name,
            categoryCode,
            ingredient.PriceModifier.Amount,
            compatibleWith,
            ingredient.Color,
            ingredient.Shape.ToString().ToLowerInvariant(),
            ingredient.SortOrder);
    }

    public static ProductDto ToDto(this Product product, string categoryCode) =>
        new(
            product.Id,
            product.Sku.Value,
            product.Name,
            categoryCode,
            product.Price.Amount.Amount,
            product.Price.CompareAtAmount?.Amount,
            product.Tagline,
            product.Description,
            product.Tags,
            product.Status.ToString().ToLowerInvariant(),
            product.IsAvailable,
            product.Season.ToString().ToLowerInvariant(),
            product.Temperature.ToString().ToLowerInvariant(),
            product.Type.ToString().ToLowerInvariant(),
            product.Nutrition is null ? null : new NutritionFactsDto(product.Nutrition.Calories, product.Nutrition.CaffeineMg, product.Nutrition.SugarGrams),
            [.. product.Variants.Select(v => new ProductVariantDto(v.Id, v.Name, v.PriceAdjustment.Amount, v.SortOrder))],
            [.. product.Images.Select(i => new ProductImageDto(i.Id, i.Url, i.AltText, i.IsPrimary, i.SortOrder))]);

    public static ProductSummaryDto ToSummaryDto(this Product product, string categoryCode) =>
        new(
            product.Id,
            product.Sku.Value,
            product.Name,
            categoryCode,
            product.Price.Amount.Amount,
            product.Price.CompareAtAmount?.Amount,
            product.Tagline,
            product.Description,
            product.Tags,
            product.Status.ToString().ToLowerInvariant(),
            product.IsAvailable,
            product.Season.ToString().ToLowerInvariant(),
            product.Temperature.ToString().ToLowerInvariant());
}
