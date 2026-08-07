using Coffeshop.Domain.Inventory.Events;
using Coffeshop.Domain.Inventory.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Inventory;

/// <summary>
/// A real, durable, Postgres-backed hold against one <see cref="InventoryItem"/>'s available
/// stock — a deliberate deviation from the frozen Phase 0 sketch (docs/29_COMMERCE_ARCHITECTURE_FREEZE.md
/// scenario 1), which specified a Redis-backed TTL hold, not a domain aggregate. Redis has never
/// actually been wired into this backend by any real feature across Sprints 5.1–5.3 despite being
/// provisioned in `docker-compose.yml` since the Phase 0 infrastructure freeze — introducing the
/// first real Redis client/connection now, for one narrow feature, would be a disproportionate new
/// dependency next to what a real Postgres row with an `ExpiresAtUtc` column already expresses
/// correctly. This sprint's own real brief also explicitly wants a durable, independently
/// queryable reservation (an admin "Reservation viewer," a real `InventoryReservations` history
/// query) — a capability a pure ephemeral Redis hold couldn't provide without also persisting to
/// Postgres anyway, which would make Redis redundant, not load-bearing.
///
/// Its own <see cref="AggregateRoot{TId}"/> (not a child entity owned by <see cref="InventoryItem"/>)
/// for the same reason <c>Order</c> doesn't hold "every historical order for this customer" as a
/// child collection: reservations accumulate per ingredient without bound over the system's
/// lifetime, and an admin reservation viewer/history query needs to page through them
/// independently — an EF owned child collection would load unboundedly.
/// </summary>
public sealed class InventoryReservation : AuditableEntity<Guid>
{
    public Guid InventoryItemId { get; private set; }

    public Guid IngredientId { get; private set; }

    public Guid OrderId { get; private set; }

    public int Quantity { get; private set; }

    public InventoryReservationStatus Status { get; private set; }

    public DateTimeOffset ExpiresAtUtc { get; private set; }

    /// <summary>When this reservation actually left <see cref="InventoryReservationStatus.Active"/> — real audit/history value for the admin "Reservation viewer," not just a status flag with no timeline.</summary>
    public DateTimeOffset? ClosedAtUtc { get; private set; }

    private InventoryReservation()
    {
    }

    internal static InventoryReservation Create(Guid inventoryItemId, Guid ingredientId, Guid orderId, int quantity, DateTimeOffset occurredAtUtc, DateTimeOffset expiresAtUtc)
    {
        var reservation = new InventoryReservation
        {
            Id = Guid.NewGuid(),
            InventoryItemId = inventoryItemId,
            IngredientId = ingredientId,
            OrderId = orderId,
            Quantity = quantity,
            Status = InventoryReservationStatus.Active,
            ExpiresAtUtc = expiresAtUtc,
        };

        reservation.AddDomainEvent(new InventoryReservationCreatedEvent(reservation.Id, inventoryItemId, orderId, quantity));
        reservation.AddDomainEvent(new InventoryReservedEvent(inventoryItemId, ingredientId, reservation.Id, orderId, quantity));
        return reservation;
    }

    /// <summary>Real, wall-clock expiry — treated as inactive by every availability calculation the moment this returns true, even before <see cref="Expire"/> has been explicitly called to formally close it out. No background dispatcher exists yet in this codebase for any bounded context (the Outbox's own Hangfire dispatcher is still undispatched since Sprint 5.1 — see docs/32_COMMERCE_EVENT_CATALOG.md) — <c>ExpireReservationCommand</c> (Sprint 5.4's own real, named command) is the explicit, on-demand way this gets formally closed, not a speculative scheduled job this sprint doesn't build.</summary>
    public bool IsExpired(DateTimeOffset nowUtc) => Status == InventoryReservationStatus.Active && nowUtc >= ExpiresAtUtc;

    public void Consume(DateTimeOffset occurredAtUtc)
    {
        EnsureActive();
        Status = InventoryReservationStatus.Consumed;
        ClosedAtUtc = occurredAtUtc;
    }

    public void Release(DateTimeOffset occurredAtUtc)
    {
        EnsureActive();
        Status = InventoryReservationStatus.Released;
        ClosedAtUtc = occurredAtUtc;
        AddDomainEvent(new InventoryReleasedEvent(InventoryItemId, IngredientId, Id, OrderId, Quantity));
    }

    public void Expire(DateTimeOffset occurredAtUtc)
    {
        EnsureActive();
        Status = InventoryReservationStatus.Expired;
        ClosedAtUtc = occurredAtUtc;
        AddDomainEvent(new InventoryReservationExpiredEvent(Id, InventoryItemId, OrderId, Quantity));
    }

    private void EnsureActive()
    {
        if (Status != InventoryReservationStatus.Active)
        {
            throw new InvalidReservationStatusException($"This reservation is '{Status}' and can no longer be transitioned.");
        }
    }
}
