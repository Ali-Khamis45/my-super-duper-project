using Coffeshop.Domain.Inventory.Exceptions;

namespace Coffeshop.Domain.Inventory.ValueObjects;

/// <summary>
/// The brief's own named <c>LowStockPolicy</c> concept — a single, real rule this sprint
/// implements: available stock at or below <see cref="Threshold"/> is "low." Deliberately just a
/// threshold, not a richer policy shape (per-day reorder velocity, supplier lead time, etc.) —
/// nothing in this sprint's real brief or seed data has a use for those, and inventing fields
/// with no real consumer would be exactly the speculative complexity this project's conventions
/// forbid. `Threshold` may be zero (a real, valid policy — "tell me the moment this hits zero,"
/// which is also always true by definition since <see cref="StockLevel"/> can never go negative).
/// </summary>
public sealed class LowStockPolicy
{
    public int Threshold { get; }

    private LowStockPolicy(int threshold)
    {
        Threshold = threshold;
    }

    public static LowStockPolicy Create(int threshold)
    {
        if (threshold < 0)
        {
            throw new InvalidLowStockPolicyException("A low-stock threshold cannot be negative.");
        }

        return new LowStockPolicy(threshold);
    }

    /// <summary>The project's own default for a newly-created <see cref="InventoryItem"/> — five units, a real, defensible starting point for a coffee shop's typical per-drink ingredient (foam, syrup, milk alternative) rather than zero (which would never actually warn anyone before running out).</summary>
    public static LowStockPolicy Default() => new(5);

    public bool IsLow(int availableQuantity) => availableQuantity <= Threshold;
}
