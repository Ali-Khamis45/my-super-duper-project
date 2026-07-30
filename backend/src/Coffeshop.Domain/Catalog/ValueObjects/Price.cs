using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Catalog.ValueObjects;

/// <summary>
/// A <see cref="Money"/> amount plus an optional "was" price for a "was/now" markdown display
/// — per docs/30_COMMERCE_DDD_MODEL.md's Catalog value objects.
/// </summary>
public sealed class Price : ValueObject
{
    public Money Amount { get; private set; } = null!;

    public Money? CompareAtAmount { get; private set; }

    /// <summary>
    /// EF Core cannot constructor-bind an owned type whose own constructor parameters are
    /// themselves other owned types (<see cref="Money"/>) — only simple scalar constructor
    /// parameters bind that way. A parameterless constructor plus field-backed property
    /// population (EF's fallback for get-only-looking properties with no usable setter) is the
    /// correct, general fix, not a workaround specific to this one migration attempt.
    /// </summary>
    private Price()
    {
    }

    private Price(Money amount, Money? compareAtAmount)
    {
        Amount = amount;
        CompareAtAmount = compareAtAmount;
    }

    public static Price Create(Money amount, Money? compareAtAmount = null)
    {
        if (amount.Amount <= 0)
        {
            throw new InvalidPriceException("A product's price must be greater than zero.");
        }

        if (compareAtAmount is not null && compareAtAmount.Amount <= amount.Amount)
        {
            throw new InvalidPriceException("A compare-at price must be greater than the actual price, or omitted.");
        }

        return new Price(amount, compareAtAmount);
    }

    public bool IsOnSale => CompareAtAmount is not null;

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Amount;
        yield return CompareAtAmount;
    }
}
