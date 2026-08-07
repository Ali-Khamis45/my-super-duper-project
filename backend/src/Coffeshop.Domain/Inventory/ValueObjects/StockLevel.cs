using Coffeshop.Domain.Inventory.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Inventory.ValueObjects;

/// <summary>
/// The real, current on-hand balance for one <see cref="InventoryItem"/> — never negative, the
/// domain invariant docs/30_COMMERCE_DDD_MODEL.md's Inventory section names explicitly. Named
/// <c>StockLevel</c> (the real Sprint 5.4 brief's own name), not the frozen Phase 0 sketch's
/// original <c>StockQuantity</c> — the same "real implementation refines the sketch's naming"
/// precedent <c>ProductStatus</c>/<c>ProductArchived</c> already established in Sprint 5.2.
/// </summary>
public sealed class StockLevel : ValueObject
{
    public int Value { get; }

    private StockLevel(int value)
    {
        Value = value;
    }

    public static StockLevel Create(int value)
    {
        if (value < 0)
        {
            throw new NegativeStockException("Stock cannot go negative.");
        }

        return new StockLevel(value);
    }

    public static StockLevel Zero() => new(0);

    public StockLevel Add(Quantity quantity) => Create(Value + quantity.Value);

    /// <summary>Throws <see cref="NegativeStockException"/> rather than clamping to zero — a debit that would go negative is a real bug (an over-reservation/over-consumption slipping past the caller's own check), not a value to silently correct.</summary>
    public StockLevel Subtract(Quantity quantity) => Create(Value - quantity.Value);

    /// <summary>Whole-value comparison against an amount — not a C# comparison operator, since <see cref="StockLevel"/>/<see cref="Quantity"/> are deliberately different types (a balance vs. an amount) and operator pairing rules (`&lt;`/`&gt;` and `&lt;=`/`&gt;=` must each be defined together) would force defining a full four-operator set this codebase has no real use for beyond this one check.</summary>
    public bool IsSufficientFor(Quantity quantity) => Value >= quantity.Value;

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value.ToString();
}
