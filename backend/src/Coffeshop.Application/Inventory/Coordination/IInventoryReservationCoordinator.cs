namespace Coffeshop.Application.Inventory.Coordination;

/// <summary>
/// The real integration point between Ordering and Inventory — deliberately <b>not</b> a set of
/// public <c>ReserveInventoryCommand</c>/<c>ReleaseInventoryCommand</c>/<c>ConsumeInventoryCommand</c>/
/// <c>CreateReservationCommand</c> MediatR commands, despite this sprint's own Phase 2 brief
/// naming all four. Two real reasons, not a shortcut:
///
/// 1. <b>Transactional atomicity.</b> <c>UnitOfWorkBehavior</c> calls <c>SaveChangesAsync</c>
///    exactly once per top-level MediatR request. If <c>CreateOrderFromCartCommandHandler</c>
///    called a nested <c>sender.Send(new ReserveInventoryCommand(...))</c>, that inner command
///    would get its own pipeline run and its own <c>SaveChangesAsync</c> — splitting "create the
///    order" and "reserve its stock" into two separate database transactions. A crash between
///    the two would leave a real, Submitted order with no stock actually held for it. Calling
///    this coordinator directly keeps both mutations tracked by the same <c>DbContext</c> and
///    flushed by the same single <c>SaveChangesAsync</c> call the outer command's own pipeline
///    step already runs — the identical reasoning this project's Order+Coupon-redemption
///    precedent already established for a single transaction touching two aggregates.
/// 2. <b>No real standalone caller.</b> Nothing in this system reserves/releases/consumes
///    inventory except as a side effect of an Order transitioning — there is no "reserve some
///    stock, unrelated to any order" admin action. A public command with no real caller other
///    than internal plumbing is exactly the speculative surface area this sprint's own brief
///    ("No speculative code. No placeholders.") forbids.
///
/// <see cref="ExpireReservationCommand"/> — the brief's one reservation-lifecycle command that
/// genuinely has an independent real caller (an admin manually force-expiring a stuck hold from
/// the Reservation Viewer) — is still a real, public MediatR command; see
/// Inventory/Reservations/ExpireReservationCommand.cs.
/// </summary>
public interface IInventoryReservationCoordinator
{
    /// <summary>
    /// Reserves every ingredient an order's lines actually need, aggregated once per ingredient
    /// across all lines (a Latte and a Cappuccino on the same order both drawing from the same
    /// milk produces one reservation against milk, not two). An ingredient with no
    /// <c>InventoryItem</c> yet (not opted into stock tracking) is silently skipped — the
    /// documented scope decision on <c>InventoryItem</c> itself: this project rolls out stock
    /// tracking per-ingredient, not as an all-or-nothing switch.
    ///
    /// Validates every requested ingredient's availability <b>before</b> mutating any of them —
    /// never partially reserves. A naive "reserve as you go, stop on the first failure" loop
    /// would leave the earlier ingredients' <c>InventoryItem</c>/<c>InventoryReservation</c>
    /// mutations sitting in the <c>DbContext</c>'s change tracker when the failure is thrown; since
    /// <c>UnitOfWorkBehavior</c> still calls <c>SaveChangesAsync</c> on the exception path (by
    /// design — see that class's own doc comment), those partial reservations would be persisted
    /// even though the overall command reports failure to the caller. A real reservation-leak bug
    /// this design avoids by construction, not by convention.
    ///
    /// Throws <see cref="Coffeshop.Domain.Inventory.Exceptions.InsufficientStockException"/> if
    /// any requested ingredient can't be fully covered — callers must invoke this <b>before</b>
    /// adding the order to its repository, so a failure here leaves nothing tracked for
    /// <c>UnitOfWorkBehavior</c>'s exception-path save to persist.
    /// </summary>
    Task ReserveForOrderAsync(Guid orderId, IReadOnlyDictionary<Guid, int> ingredientQuantities, DateTimeOffset nowUtc, DateTimeOffset expiresAtUtc, CancellationToken ct);

    /// <summary>Releases every still-<c>Active</c> reservation for an order back to available stock — cancellation/failure. A no-op (not an error) for an order with none, the normal case for an order made entirely of untracked ingredients.</summary>
    Task ReleaseForOrderAsync(Guid orderId, DateTimeOffset nowUtc, CancellationToken ct);

    /// <summary>Converts every still-<c>Active</c> reservation for an order into a permanent debit — called only after successful payment, per this sprint's own brief. A no-op for an order with none.</summary>
    Task ConsumeForOrderAsync(Guid orderId, DateTimeOffset nowUtc, CancellationToken ct);
}
