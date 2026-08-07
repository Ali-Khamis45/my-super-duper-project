using Coffeshop.Domain.Inventory;

namespace Coffeshop.Application.Inventory.Interfaces;

public sealed record InventoryTransactionFilter(Guid? InventoryItemId = null, Guid? IngredientId = null, InventoryReason? Reason = null, Guid? OrderId = null);

/// <summary>
/// Deliberately not <see cref="IRepository{TAggregate,TId}"/> — <see cref="InventoryTransaction"/>
/// is a plain <c>Entity&lt;Guid&gt;</c>, not an <c>AggregateRoot</c> (see its own doc comment: an
/// immutable, append-only ledger row with no independent lifecycle), so it doesn't fit the base
/// contract's <c>AggregateRoot</c> constraint. A narrower, purpose-built shape instead: write-once
/// (<see cref="Add"/>), read via history queries — never a <c>GetByIdAsync</c> nobody needs.
/// </summary>
public interface IInventoryTransactionRepository
{
    void Add(InventoryTransaction transaction);

    Task<(IReadOnlyList<InventoryTransaction> Items, int TotalCount)> GetPagedAsync(InventoryTransactionFilter filter, int skip, int take, CancellationToken ct);
}
