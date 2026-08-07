using Coffeshop.Domain.Common;
using Coffeshop.Domain.Inventory;

namespace Coffeshop.Application.Inventory.Interfaces;

public sealed record InventoryReservationFilter(InventoryReservationStatus? Status = null, Guid? OrderId = null, Guid? IngredientId = null);

/// <summary>Extends <see cref="IRepository{TAggregate,TId}"/> additively, matching every other repository in this codebase.</summary>
public interface IInventoryReservationRepository : IRepository<InventoryReservation, Guid>
{
    /// <summary>Backs <c>IInventoryReservationCoordinator</c>'s Release/Consume paths — an order's own reservations, still <see cref="InventoryReservationStatus.Active"/>. Empty for an order whose items were all untracked ingredients, a normal, non-error case.</summary>
    Task<IReadOnlyList<InventoryReservation>> GetActiveByOrderIdAsync(Guid orderId, CancellationToken ct);

    /// <summary>
    /// Backs the lazy-expiry sweep in <c>IInventoryReservationCoordinator</c>'s reserve path — see
    /// that interface's own doc comment for why this project has no background worker sweeping
    /// every reservation on a timer, and instead reclaims a specific <see cref="InventoryItem"/>'s
    /// own expired holds at the one moment something else actually needs that stock.
    /// </summary>
    Task<IReadOnlyList<InventoryReservation>> GetExpiredActiveByInventoryItemIdAsync(Guid inventoryItemId, DateTimeOffset nowUtc, CancellationToken ct);

    Task<(IReadOnlyList<InventoryReservation> Items, int TotalCount)> GetPagedAsync(InventoryReservationFilter filter, int skip, int take, CancellationToken ct);
}
