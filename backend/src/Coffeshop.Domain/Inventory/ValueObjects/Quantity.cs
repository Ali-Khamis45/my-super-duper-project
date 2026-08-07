using Coffeshop.Domain.Inventory.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Inventory.ValueObjects;

/// <summary>
/// A real, positive amount of a stocked ingredient — reservations, restocks, and consumption
/// amounts all use this, never a bare <c>int</c>. Deliberately distinct from
/// <see cref="StockLevel"/> (a *balance*, which is allowed to be zero) — a reservation/restock/
/// consumption of "zero" is meaningless and is rejected here rather than silently accepted.
/// </summary>
public sealed class Quantity : ValueObject
{
    public int Value { get; }

    private Quantity(int value)
    {
        Value = value;
    }

    public static Quantity Create(int value)
    {
        if (value <= 0)
        {
            throw new InvalidQuantityException("A quantity must be a positive number.");
        }

        return new Quantity(value);
    }

    public static Quantity operator +(Quantity left, Quantity right) => Create(left.Value + right.Value);

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value.ToString();
}
