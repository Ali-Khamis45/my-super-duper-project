using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Inventory;

/// <summary>
/// A real, immutable, append-only ledger entry — every time <see cref="InventoryItem"/>'s
/// on-hand <see cref="StockLevel"/> actually changes (never for a reservation, which holds stock
/// without moving the on-hand balance). The brief's own Phase 1 list names both
/// <c>InventoryAdjustment</c> and <c>InventoryTransaction</c> as separate concepts — implemented
/// here as one real ledger entity distinguished by <see cref="Reason"/>, not two overlapping
/// tables recording the same "the balance changed, here's why" fact twice. The same discipline
/// Sprint 5.3 already applied to <c>OrderAudit</c>/<c>OrderTimeline</c> (docs/30_COMMERCE_DDD_MODEL.md's
/// own Sprint 5.3 implementation-status note): map two brief-named concepts onto one real
/// mechanism when a second, parallel one would just record the same fact twice.
///
/// Independently persisted (own table, own repository), not an EF owned child collection of
/// <see cref="InventoryItem"/> — the same unbounded-growth-over-time reasoning
/// <see cref="InventoryReservation"/>'s own doc comment gives.
/// </summary>
public sealed class InventoryTransaction : Entity<Guid>
{
    public Guid InventoryItemId { get; private set; }

    public Guid IngredientId { get; private set; }

    public InventoryReason Reason { get; private set; }

    /// <summary>Signed — positive for a restock/upward adjustment, negative for a consumption/downward adjustment. The one field that actually explains "which direction did the balance move," not just "it changed."</summary>
    public int QuantityDelta { get; private set; }

    /// <summary>The real on-hand balance immediately after this transaction — the brief's own named <c>InventorySnapshot</c> concept, implemented as a running balance captured on each ledger entry rather than a separately-scheduled snapshot table with no real consumer of "the balance at an arbitrary point in time nothing else asked about." Lets a real history/audit view show "balance over time" by reading this column directly, without replaying the whole transaction list.</summary>
    public int BalanceAfter { get; private set; }

    /// <summary>Correlates a <see cref="InventoryReason.OrderConsumption"/> transaction back to the real order that caused it — <c>null</c> for restocks/manual adjustments, which have no order to reference.</summary>
    public Guid? OrderId { get; private set; }

    /// <summary>A real, human-readable reason — required for <see cref="InventoryReason.ManualAdjustment"/> (staff must say why), optional/blank otherwise.</summary>
    public string? Note { get; private set; }

    public DateTimeOffset OccurredAtUtc { get; private set; }

    private InventoryTransaction()
    {
    }

    internal static InventoryTransaction Create(Guid inventoryItemId, Guid ingredientId, InventoryReason reason, int quantityDelta, int balanceAfter, Guid? orderId, string? note, DateTimeOffset occurredAtUtc) =>
        new()
        {
            Id = Guid.NewGuid(),
            InventoryItemId = inventoryItemId,
            IngredientId = ingredientId,
            Reason = reason,
            QuantityDelta = quantityDelta,
            BalanceAfter = balanceAfter,
            OrderId = orderId,
            Note = note,
            OccurredAtUtc = occurredAtUtc,
        };
}
