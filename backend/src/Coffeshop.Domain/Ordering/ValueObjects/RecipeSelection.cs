using Coffeshop.Domain.Ordering.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Ordering.ValueObjects;

/// <summary>One placed ingredient within a <see cref="RecipeSelection"/> — mirrors the frontend's own <c>IngredientPlacement</c> (`stores/customizer-store.ts`) field-for-field.</summary>
public sealed record RecipeIngredientPlacement(string IngredientId, int Quantity);

/// <summary>
/// A direct, intentional mirror of the frontend's <c>CustomizerSelection</c> shape
/// (`stores/customizer-store.ts`), per docs/30_COMMERCE_DDD_MODEL.md's frozen Ordering value
/// objects table. Deliberately plain strings for `Color`/`Size`/`Sleeve`/`Lid`/`Logo`/`Material`
/// rather than six backend enums kept in lockstep with the frontend's own six cosmetic-variant
/// unions — this VO's only real job is "redisplay exactly what was ordered" (an order receipt,
/// a "my orders" history entry), never a server-side query/filter target, so it stores what the
/// frontend sent without re-deriving a parallel, backend-owned catalog of variant ids that would
/// only ever exist to duplicate what `stores/customizer-store.ts`/`data/{colors,lids,...}.ts`
/// already define.
/// </summary>
public sealed class RecipeSelection : ValueObject
{
    public string Color { get; }

    public string Size { get; }

    public string Sleeve { get; }

    public string Lid { get; }

    public string Logo { get; }

    public string Material { get; }

    public IReadOnlyList<RecipeIngredientPlacement> Ingredients { get; }

    private RecipeSelection(string color, string size, string sleeve, string lid, string logo, string material, IReadOnlyList<RecipeIngredientPlacement> ingredients)
    {
        Color = color;
        Size = size;
        Sleeve = sleeve;
        Lid = lid;
        Logo = logo;
        Material = material;
        Ingredients = ingredients;
    }

    public static RecipeSelection Create(string color, string size, string sleeve, string lid, string logo, string material, IEnumerable<RecipeIngredientPlacement> ingredients)
    {
        if (string.IsNullOrWhiteSpace(color) || string.IsNullOrWhiteSpace(size) || string.IsNullOrWhiteSpace(sleeve)
            || string.IsNullOrWhiteSpace(lid) || string.IsNullOrWhiteSpace(logo) || string.IsNullOrWhiteSpace(material))
        {
            throw new InvalidRecipeSelectionException("Every cosmetic field of a recipe selection is required — this is a snapshot of a real, complete customizer selection, never a partial one.");
        }

        var placements = ingredients.ToArray();
        if (placements.Any(p => p.Quantity <= 0))
        {
            throw new InvalidRecipeSelectionException("An ingredient placement's quantity must be positive.");
        }

        return new RecipeSelection(color, size, sleeve, lid, logo, material, placements);
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Color;
        yield return Size;
        yield return Sleeve;
        yield return Lid;
        yield return Logo;
        yield return Material;
        foreach (var ingredient in Ingredients)
        {
            yield return ingredient;
        }
    }
}
