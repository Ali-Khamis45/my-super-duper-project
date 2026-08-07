namespace Coffeshop.Domain.Inventory;

/// <summary>
/// A materialized, persisted summary of <see cref="InventoryItem"/>'s own current
/// availability — recomputed by the aggregate itself on every mutation, never set directly by a
/// caller. Persisted (not just computed on read) specifically so <c>GetOutOfStockProducts</c>/
/// <c>LowStockReport</c> can filter with a real indexed `WHERE status = ...` instead of
/// recomputing every row on every request.
/// </summary>
public enum InventoryStatus
{
    Available,
    LowStock,
    OutOfStock,
}

/// <summary>An <see cref="InventoryReservation"/>'s own lifecycle state — a closed set, matching <c>Coffeshop.Domain.Ordering.OrderStatus</c>'s own "real state machine, not a free string" precedent.</summary>
public enum InventoryReservationStatus
{
    Active,
    Consumed,
    Released,
    Expired,
}

/// <summary>
/// Why an <see cref="InventoryTransaction"/> happened — the brief's own named
/// <c>InventoryReason</c> concept. A closed set covering every real way <see cref="InventoryItem"/>'s
/// on-hand <c>StockLevel</c> actually changes in this system; distinguishes an order-driven
/// consumption from a staff-driven restock/adjustment without needing two parallel ledger types
/// (<c>InventoryAdjustment</c>/<c>InventoryTransaction</c> from the brief's own Phase 1 list —
/// see <see cref="InventoryTransaction"/>'s own doc comment for why this project models both as
/// one real ledger entity distinguished by this enum, not two overlapping ones).
/// </summary>
public enum InventoryReason
{
    /// <summary>An order's reservation converted into a real debit once the order was marked paid.</summary>
    OrderConsumption,

    /// <summary>Staff recording new stock arriving from a supplier.</summary>
    Restock,

    /// <summary>Staff correcting the recorded balance against a physical count/spoilage/breakage — the only reason that can move the balance in either direction.</summary>
    ManualAdjustment,
}
