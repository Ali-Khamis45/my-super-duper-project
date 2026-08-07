using Coffeshop.Domain.Inventory;
using Coffeshop.Domain.Inventory.Events;
using Coffeshop.Domain.Inventory.Exceptions;
using Coffeshop.Domain.Inventory.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Coffeshop.Domain.Tests.Inventory;

public sealed class InventoryItemTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid IngredientId = Guid.NewGuid();
    private static readonly Guid OrderId = Guid.NewGuid();

    private static InventoryItem NewItem(int initialStock = 10, int threshold = 5) =>
        InventoryItem.Create(IngredientId, initialStock, Now, LowStockPolicy.Create(threshold));

    [Fact]
    public void Create_SetsInitialStateAndRaisesInventoryItemCreatedEvent()
    {
        var item = NewItem(10);

        item.StockLevel.Value.Should().Be(10);
        item.ReservedQuantity.Value.Should().Be(0);
        item.AvailableQuantity.Should().Be(10);
        item.Status.Should().Be(InventoryStatus.Available);
        item.DomainEvents.Should().ContainSingle(e => e is InventoryItemCreatedEvent);
    }

    [Fact]
    public void Create_ZeroInitialStock_StartsOutOfStock()
    {
        var item = NewItem(0);
        item.Status.Should().Be(InventoryStatus.OutOfStock);
    }

    [Fact]
    public void Reserve_WithinAvailability_IncreasesReservedAndReturnsRealReservation()
    {
        var item = NewItem(10);
        item.ClearDomainEvents();

        var reservation = item.Reserve(OrderId, 3, Now, Now.AddHours(24));

        item.ReservedQuantity.Value.Should().Be(3);
        item.AvailableQuantity.Should().Be(7);
        reservation.Status.Should().Be(InventoryReservationStatus.Active);
        reservation.Quantity.Should().Be(3);
        reservation.OrderId.Should().Be(OrderId);
        reservation.InventoryItemId.Should().Be(item.Id);
    }

    [Fact]
    public void Reserve_ExceedingAvailability_ThrowsInsufficientStockAndRaisesReservationFailedEvent()
    {
        var item = NewItem(5);
        item.ClearDomainEvents();

        var act = () => item.Reserve(OrderId, 6, Now, Now.AddHours(24));

        act.Should().Throw<InsufficientStockException>();
        item.DomainEvents.Should().ContainSingle(e => e is InventoryReservationFailedEvent);
        item.ReservedQuantity.Value.Should().Be(0, "a failed reservation must never partially hold stock");
    }

    [Fact]
    public void Reserve_ExactlyAllAvailable_Succeeds()
    {
        var item = NewItem(5);
        var reservation = item.Reserve(OrderId, 5, Now, Now.AddHours(24));

        reservation.Quantity.Should().Be(5);
        item.AvailableQuantity.Should().Be(0);
        item.Status.Should().Be(InventoryStatus.OutOfStock);
    }

    [Fact]
    public void Reserve_CrossingLowStockThreshold_RaisesInventoryLowStockEvent()
    {
        var item = NewItem(10, threshold: 5);
        item.ClearDomainEvents();

        item.Reserve(OrderId, 6, Now, Now.AddHours(24)); // available drops from 10 to 4, <= threshold 5

        item.Status.Should().Be(InventoryStatus.LowStock);
        item.DomainEvents.Should().ContainSingle(e => e is InventoryLowStockEvent);
    }

    [Fact]
    public void Release_ReturnsHeldStockToAvailable()
    {
        var item = NewItem(10);
        item.Reserve(OrderId, 4, Now, Now.AddHours(24));

        item.Release(4, Now);

        item.ReservedQuantity.Value.Should().Be(0);
        item.AvailableQuantity.Should().Be(10);
    }

    [Fact]
    public void Consume_MovesStockOutOfBothReservedAndOnHand()
    {
        var item = NewItem(10);
        item.Reserve(OrderId, 4, Now, Now.AddHours(24));
        item.ClearDomainEvents();

        var transaction = item.Consume(OrderId, 4, Now);

        item.StockLevel.Value.Should().Be(6);
        item.ReservedQuantity.Value.Should().Be(0);
        item.AvailableQuantity.Should().Be(6);
        transaction.QuantityDelta.Should().Be(-4);
        transaction.BalanceAfter.Should().Be(6);
        transaction.Reason.Should().Be(InventoryReason.OrderConsumption);
        transaction.OrderId.Should().Be(OrderId);
        item.DomainEvents.Should().ContainSingle(e => e is InventoryConsumedEvent);
    }

    [Fact]
    public void Restock_IncreasesOnHandStockAndNeverTouchesReserved()
    {
        var item = NewItem(2, threshold: 5);
        item.Reserve(OrderId, 1, Now, Now.AddHours(24));
        item.ClearDomainEvents();

        var transaction = item.Restock(20, Now, "Weekly delivery");

        item.StockLevel.Value.Should().Be(22);
        item.ReservedQuantity.Value.Should().Be(1, "restock must never touch an existing reservation");
        transaction.QuantityDelta.Should().Be(20);
        transaction.Reason.Should().Be(InventoryReason.Restock);
        item.Status.Should().Be(InventoryStatus.Available, "restock past the threshold recovers from LowStock");
        item.DomainEvents.Should().ContainSingle(e => e is InventoryRestockedEvent);
        item.DomainEvents.Should().ContainSingle(e => e is InventoryBackInStockEvent);
    }

    [Fact]
    public void Adjust_PositiveDelta_IncreasesStock()
    {
        var item = NewItem(10);
        var transaction = item.Adjust(3, "Physical count correction", Now);

        item.StockLevel.Value.Should().Be(13);
        transaction.QuantityDelta.Should().Be(3);
        transaction.Reason.Should().Be(InventoryReason.ManualAdjustment);
        transaction.Note.Should().Be("Physical count correction");
    }

    [Fact]
    public void Adjust_NegativeDelta_DecreasesStock()
    {
        var item = NewItem(10);
        var transaction = item.Adjust(-4, "Spoilage", Now);

        item.StockLevel.Value.Should().Be(6);
        transaction.QuantityDelta.Should().Be(-4);
    }

    [Fact]
    public void Adjust_NegativeDeltaExceedingStock_ThrowsNegativeStockException()
    {
        var item = NewItem(3);
        var act = () => item.Adjust(-5, "Breakage", Now);
        act.Should().Throw<NegativeStockException>();
    }

    [Fact]
    public void Adjust_ZeroDelta_ThrowsInvalidQuantityException()
    {
        var item = NewItem(10);
        var act = () => item.Adjust(0, "Nothing changed", Now);
        act.Should().Throw<InvalidQuantityException>();
    }

    [Fact]
    public void Adjust_EmptyReason_ThrowsInvalidQuantityException()
    {
        var item = NewItem(10);
        var act = () => item.Adjust(2, "  ", Now);
        act.Should().Throw<InvalidQuantityException>();
    }

    [Fact]
    public void MarkOutOfStock_ForcesStatusRegardlessOfRealBalance()
    {
        var item = NewItem(50, threshold: 5);
        item.ClearDomainEvents();

        item.MarkOutOfStock(Now);

        item.Status.Should().Be(InventoryStatus.OutOfStock);
        item.StockLevel.Value.Should().Be(50, "the manual override never touches the real balance");
        item.DomainEvents.Should().ContainSingle(e => e is InventoryOutOfStockEvent);
    }

    [Fact]
    public void MarkOutOfStock_CalledTwice_RaisesTheEventOnlyOnce()
    {
        var item = NewItem(50);
        item.MarkOutOfStock(Now);
        item.ClearDomainEvents();

        item.MarkOutOfStock(Now);

        item.DomainEvents.Should().BeEmpty();
    }

    [Fact]
    public void MarkAvailable_RederivesRealStatusRatherThanForcingAvailable()
    {
        var item = NewItem(0); // genuinely out of stock
        item.MarkOutOfStock(Now);

        item.MarkAvailable(Now);

        item.Status.Should().Be(InventoryStatus.OutOfStock, "re-derived from a real balance of zero, not forced Available");
    }

    [Fact]
    public void MarkAvailable_AfterRealRestock_ClearsAManualOverride()
    {
        var item = NewItem(50);
        item.MarkOutOfStock(Now);

        item.Restock(1, Now); // any real stock movement recomputes status

        item.Status.Should().Be(InventoryStatus.Available);
    }

    [Fact]
    public void UpdateLowStockPolicy_RecomputesStatusAgainstTheNewThreshold()
    {
        var item = NewItem(10, threshold: 2);
        item.Status.Should().Be(InventoryStatus.Available);

        item.UpdateLowStockPolicy(15, Now);

        item.Status.Should().Be(InventoryStatus.LowStock, "10 available is now <= the new threshold of 15");
    }

    [Fact]
    public void ConcurrentReservations_CannotOversellBeyondOnHandStock()
    {
        // Not a real concurrency test (see Coffeshop.IntegrationTests for the actual concurrent
        // HTTP-request race) — this locks in the sequential invariant the aggregate itself
        // enforces, which is what the real xmin-backed optimistic concurrency check protects
        // once two requests really do race for the same row.
        var item = NewItem(10);
        item.Reserve(Guid.NewGuid(), 6, Now, Now.AddHours(24));

        var act = () => item.Reserve(Guid.NewGuid(), 6, Now, Now.AddHours(24));

        act.Should().Throw<InsufficientStockException>();
    }
}
