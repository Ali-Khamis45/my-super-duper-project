using Coffeshop.Domain.Inventory.Events;
using Coffeshop.Domain.Inventory.Exceptions;
using Coffeshop.Domain.Inventory.ValueObjects;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Inventory;

/// <summary>
/// The Inventory bounded context's aggregate root — one per <see cref="Coffeshop.Domain.Catalog.Ingredient"/>,
/// per docs/30_COMMERCE_DDD_MODEL.md's own frozen Inventory sketch ("a coffee shop's real
/// constraint is usually ingredient-level, not finished-drink-level, since a Latte and a
/// Cappuccino both consume the same milk"). The brief's own Phase 1 list names "Inventory
/// Aggregate" and "InventoryItem" as if they were two separate concepts — they are the same
/// aggregate root; a wrapper "Inventory" aggregate holding many `InventoryItem`s would be exactly
/// the god-aggregate anti-pattern this project's own DDD conventions already forbid (matching
/// `Product`/`Category`/`Ingredient` staying three separate aggregates in Sprint 5.2, not one
/// "Catalog" aggregate).
///
/// A real, deliberate, documented scope decision carried over from the frozen sketch's own words:
/// this aggregate tracks *ingredients a customer explicitly added via customization*
/// (`RecipeSelection.Ingredients` — foam, an extra shot, oat milk), never a hypothetical "base
/// recipe" for what a Cappuccino itself is made of. No such bill-of-materials data exists
/// anywhere in `Product`/`ProductVariant` (verified during this sprint's own Phase 0 audit), and
/// inventing one now — deciding how many shots or how much milk a Cappuccino "really" contains —
/// would be exactly the fabricated data this project's conventions forbid. Composing "what does
/// completing this order consume" stays an Ordering-context concern that reads `OrderItem.Selection`
/// and hands Inventory a flat ingredient-id/quantity list, per
/// docs/29_COMMERCE_ARCHITECTURE_FREEZE.md scenario 5's own explicit resolution — Inventory itself
/// never needs to understand what a "recipe" is.
/// </summary>
public sealed class InventoryItem : AuditableEntity<Guid>
{
    public Guid IngredientId { get; private set; }

    public StockLevel StockLevel { get; private set; } = null!;

    /// <summary>Currently held by active <see cref="InventoryReservation"/>s against this item — a running counter maintained by <see cref="Reserve"/>/<see cref="Release"/>/<see cref="Consume"/>, not recomputed by summing reservation rows on every read (an O(1) aggregate-owned invariant, the same reasoning <c>Order.Totals</c> is a maintained running total rather than resummed from line items on every access).</summary>
    public StockLevel ReservedQuantity { get; private set; } = null!;

    public LowStockPolicy LowStockPolicy { get; private set; } = null!;

    public InventoryStatus Status { get; private set; }

    /// <summary>What's actually reservable right now — on-hand minus already-reserved. Never persisted separately; always derived from <see cref="StockLevel"/>/<see cref="ReservedQuantity"/> so the two can never drift out of sync with each other.</summary>
    public int AvailableQuantity => StockLevel.Value - ReservedQuantity.Value;

    private InventoryItem()
    {
    }

    public static InventoryItem Create(Guid ingredientId, int initialStock, DateTimeOffset occurredAtUtc, LowStockPolicy? lowStockPolicy = null)
    {
        var item = new InventoryItem
        {
            Id = Guid.NewGuid(),
            IngredientId = ingredientId,
            StockLevel = ValueObjects.StockLevel.Create(initialStock),
            ReservedQuantity = ValueObjects.StockLevel.Zero(),
            LowStockPolicy = lowStockPolicy ?? ValueObjects.LowStockPolicy.Default(),
        };

        item.RecalculateStatus(occurredAtUtc, raiseTransitionEvents: false);
        item.AddDomainEvent(new InventoryItemCreatedEvent(item.Id, ingredientId));
        return item;
    }

    /// <summary>Holds stock against a real order without moving the on-hand balance — throws <see cref="InsufficientStockException"/> (after raising <see cref="InventoryReservationFailedEvent"/>, per <c>UnitOfWorkBehavior</c>'s own "mutate/raise, then throw" pattern, which persists the event on the exception path too) when the requested amount exceeds what's actually available. The returned <see cref="InventoryReservation"/> is a new, unsaved aggregate — the caller (the application handler) is responsible for adding it via its own repository, the same "the handler coordinates, each aggregate enforces its own invariants" pattern Sprint 5.3 established for `Order`+`Coupon`-shaped cross-aggregate operations.</summary>
    public InventoryReservation Reserve(Guid orderId, int quantity, DateTimeOffset occurredAtUtc, DateTimeOffset expiresAtUtc)
    {
        var requested = Quantity.Create(quantity);

        if (AvailableQuantity < requested.Value)
        {
            AddDomainEvent(new InventoryReservationFailedEvent(IngredientId, orderId, requested.Value, AvailableQuantity));
            throw new InsufficientStockException($"Only {AvailableQuantity} unit(s) available, {requested.Value} requested.");
        }

        ReservedQuantity = ReservedQuantity.Add(requested);
        RecalculateStatus(occurredAtUtc);

        return InventoryReservation.Create(Id, IngredientId, orderId, requested.Value, occurredAtUtc, expiresAtUtc);
    }

    /// <summary>Returns held stock to available without moving the on-hand balance — a cancelled/failed/expired order's own reservation being released back, or an already-expired reservation being formally closed. Callers pass the reservation's own <see cref="InventoryReservation.Quantity"/>, not a re-derived value.</summary>
    public void Release(int quantity, DateTimeOffset occurredAtUtc)
    {
        ReservedQuantity = ReservedQuantity.Subtract(Quantity.Create(quantity));
        RecalculateStatus(occurredAtUtc);
    }

    /// <summary>Converts a reservation into a real, permanent debit — the moment "Consumption occurs only after successful payment," per this sprint's own brief. Moves stock out of both <see cref="ReservedQuantity"/> and <see cref="StockLevel"/> together — the reservation's hold is being *fulfilled*, not released-then-separately-debited (which would let a concurrent new reservation briefly see stock as available that's actually already spoken for).</summary>
    public InventoryTransaction Consume(Guid orderId, int quantity, DateTimeOffset occurredAtUtc)
    {
        var qty = Quantity.Create(quantity);
        ReservedQuantity = ReservedQuantity.Subtract(qty);
        StockLevel = StockLevel.Subtract(qty);
        RecalculateStatus(occurredAtUtc);

        var transaction = InventoryTransaction.Create(Id, IngredientId, InventoryReason.OrderConsumption, -qty.Value, StockLevel.Value, orderId, null, occurredAtUtc);
        AddDomainEvent(new InventoryConsumedEvent(Id, IngredientId, orderId, qty.Value, StockLevel.Value));
        return transaction;
    }

    /// <summary>Staff recording new stock arriving from a supplier — moves the on-hand balance up, never touches <see cref="ReservedQuantity"/>.</summary>
    public InventoryTransaction Restock(int quantity, DateTimeOffset occurredAtUtc, string? note = null)
    {
        var qty = Quantity.Create(quantity);
        StockLevel = StockLevel.Add(qty);
        RecalculateStatus(occurredAtUtc);

        var transaction = InventoryTransaction.Create(Id, IngredientId, InventoryReason.Restock, qty.Value, StockLevel.Value, null, note, occurredAtUtc);
        AddDomainEvent(new InventoryRestockedEvent(Id, IngredientId, qty.Value, StockLevel.Value));
        return transaction;
    }

    /// <summary>A manual staff correction against a physical count/spoilage/breakage — the only operation that can move the on-hand balance in either direction, per <see cref="InventoryReason.ManualAdjustment"/>'s own doc comment. A negative delta that would take stock below zero throws <see cref="NegativeStockException"/> via <see cref="ValueObjects.StockLevel.Subtract"/>, the same real invariant every other debit path already protects.</summary>
    public InventoryTransaction Adjust(int delta, string reason, DateTimeOffset occurredAtUtc)
    {
        if (delta == 0)
        {
            throw new InvalidQuantityException("An adjustment must actually change the balance.");
        }

        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new InvalidQuantityException("A manual adjustment needs a real reason.");
        }

        StockLevel = delta > 0 ? StockLevel.Add(Quantity.Create(delta)) : StockLevel.Subtract(Quantity.Create(-delta));
        RecalculateStatus(occurredAtUtc);

        var transaction = InventoryTransaction.Create(Id, IngredientId, InventoryReason.ManualAdjustment, delta, StockLevel.Value, null, reason.Trim(), occurredAtUtc);
        AddDomainEvent(new InventoryAdjustedEvent(Id, IngredientId, delta, StockLevel.Value, reason.Trim()));
        return transaction;
    }

    /// <summary>
    /// An explicit staff override — forces <see cref="InventoryStatus.OutOfStock"/> regardless of
    /// the computed on-hand balance (e.g. a supplier delay staff already knows about, before the
    /// physical count actually hits zero). Real, named example from this sprint's own brief.
    /// Deliberately not "sticky": the next real stock movement (<see cref="Restock"/>/
    /// <see cref="Adjust"/>/<see cref="Consume"/>) recomputes <see cref="Status"/> from the
    /// current balance again and can naturally supersede this override — the alternative (a
    /// manual flag that never clears itself without a second explicit call) risks an item stuck
    /// "out of stock" forever because staff forgot to call <see cref="MarkAvailable"/> once the
    /// real issue resolved, which is the worse failure mode of the two.
    /// </summary>
    public void MarkOutOfStock(DateTimeOffset occurredAtUtc)
    {
        if (Status == InventoryStatus.OutOfStock)
        {
            return;
        }

        Status = InventoryStatus.OutOfStock;
        AddDomainEvent(new InventoryOutOfStockEvent(Id, IngredientId));
    }

    /// <summary>Reverses a manual <see cref="MarkOutOfStock"/> override — re-derives the real status from the current balance rather than forcing <see cref="InventoryStatus.Available"/> outright, so a genuinely empty item doesn't get manually marked "available" while still at zero.</summary>
    public void MarkAvailable(DateTimeOffset occurredAtUtc) => RecalculateStatus(occurredAtUtc);

    public void UpdateLowStockPolicy(int threshold, DateTimeOffset occurredAtUtc)
    {
        LowStockPolicy = ValueObjects.LowStockPolicy.Create(threshold);
        RecalculateStatus(occurredAtUtc);
    }

    private void RecalculateStatus(DateTimeOffset occurredAtUtc, bool raiseTransitionEvents = true)
    {
        var previous = Status;
        Status = AvailableQuantity <= 0
            ? InventoryStatus.OutOfStock
            : LowStockPolicy.IsLow(AvailableQuantity)
                ? InventoryStatus.LowStock
                : InventoryStatus.Available;

        if (!raiseTransitionEvents || Status == previous)
        {
            return;
        }

        if (Status == InventoryStatus.OutOfStock)
        {
            AddDomainEvent(new InventoryOutOfStockEvent(Id, IngredientId));
        }
        else if (Status == InventoryStatus.LowStock)
        {
            AddDomainEvent(new InventoryLowStockEvent(Id, IngredientId, AvailableQuantity, LowStockPolicy.Threshold));
        }
        else if (previous is InventoryStatus.OutOfStock or InventoryStatus.LowStock)
        {
            AddDomainEvent(new InventoryBackInStockEvent(Id, IngredientId));
        }
    }
}
