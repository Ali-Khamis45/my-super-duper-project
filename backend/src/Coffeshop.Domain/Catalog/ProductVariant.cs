using Coffeshop.Domain.Catalog.ValueObjects;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Catalog;

/// <summary>
/// An entity inside <see cref="Product"/> — a size/format variant (Small/Medium/Large,
/// matching the frontend's existing `CupSizeId` union exactly) with its own price adjustment.
/// Seeded at a real, honest ¤0.00 adjustment for every current product (the frontend's
/// customizer has no size-based pricing today — see `stores/customizer-store.ts` — so a
/// nonzero seed value would be fabricated, not real, data); the field is real and mutable so a
/// future real size-pricing decision is a data change, not a schema change.
/// </summary>
public sealed class ProductVariant : Entity<Guid>
{
    public string Name { get; private set; } = null!;

    public Money PriceAdjustment { get; private set; } = null!;

    public int SortOrder { get; private set; }

    private ProductVariant()
    {
    }

    internal static ProductVariant Create(string name, Money priceAdjustment, int sortOrder) =>
        new()
        {
            Id = Guid.NewGuid(),
            Name = name.Trim(),
            PriceAdjustment = priceAdjustment,
            SortOrder = sortOrder,
        };
}
