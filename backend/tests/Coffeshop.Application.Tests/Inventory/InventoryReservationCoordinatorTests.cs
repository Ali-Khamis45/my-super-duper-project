using Coffeshop.Application.Inventory.Coordination;
using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Domain.Inventory;
using Coffeshop.Domain.Inventory.Exceptions;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace Coffeshop.Application.Tests.Inventory;

public sealed class InventoryReservationCoordinatorTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private readonly IInventoryItemRepository _inventoryItemRepository = Substitute.For<IInventoryItemRepository>();
    private readonly IInventoryReservationRepository _inventoryReservationRepository = Substitute.For<IInventoryReservationRepository>();
    private readonly IInventoryTransactionRepository _inventoryTransactionRepository = Substitute.For<IInventoryTransactionRepository>();
    private readonly IInventoryReservationCoordinator _sut;

    public InventoryReservationCoordinatorTests()
    {
        _sut = new InventoryReservationCoordinator(_inventoryItemRepository, _inventoryReservationRepository, _inventoryTransactionRepository);

        // No expired holds anywhere unless a test overrides it — the coordinator's own lazy-sweep
        // step always calls this before checking availability.
        _inventoryReservationRepository.GetExpiredActiveByInventoryItemIdAsync(Arg.Any<Guid>(), Arg.Any<DateTimeOffset>(), Arg.Any<CancellationToken>())
            .Returns((IReadOnlyList<InventoryReservation>)[]);
    }

    [Fact]
    public async Task ReserveForOrderAsync_SufficientStock_ReservesEachIngredientAndAddsTheReservation()
    {
        var milkIngredientId = Guid.NewGuid();
        var milkItem = InventoryItem.Create(milkIngredientId, 20, Now);
        _inventoryItemRepository.GetByIngredientIdAsync(milkIngredientId, Arg.Any<CancellationToken>()).Returns(milkItem);

        var orderId = Guid.NewGuid();
        await _sut.ReserveForOrderAsync(orderId, new Dictionary<Guid, int> { [milkIngredientId] = 5 }, Now, Now.AddHours(24), CancellationToken.None);

        milkItem.ReservedQuantity.Value.Should().Be(5);
        milkItem.AvailableQuantity.Should().Be(15);
        _inventoryReservationRepository.Received(1).Add(Arg.Is<InventoryReservation>(r => r != null && r.OrderId == orderId && r.Quantity == 5 && r.IngredientId == milkIngredientId));
    }

    [Fact]
    public async Task ReserveForOrderAsync_UntrackedIngredient_SkipsItSilentlyRatherThanThrowing()
    {
        var untrackedIngredientId = Guid.NewGuid();
        _inventoryItemRepository.GetByIngredientIdAsync(untrackedIngredientId, Arg.Any<CancellationToken>()).Returns((InventoryItem?)null);

        var act = () => _sut.ReserveForOrderAsync(Guid.NewGuid(), new Dictionary<Guid, int> { [untrackedIngredientId] = 5 }, Now, Now.AddHours(24), CancellationToken.None);

        await act.Should().NotThrowAsync();
        _inventoryReservationRepository.DidNotReceive().Add(Arg.Any<InventoryReservation>());
    }

    [Fact]
    public async Task ReserveForOrderAsync_OneIngredientInsufficientAmongSeveral_ThrowsWithoutReservingAnyOfThem()
    {
        // The real atomicity guarantee this class exists for: a multi-ingredient order where the
        // SECOND ingredient checked can't be covered must leave the FIRST ingredient's InventoryItem
        // completely untouched — a naive "reserve as you go" loop would have already mutated it
        // before reaching the failing one. See IInventoryReservationCoordinator's own doc comment.
        var foamIngredientId = Guid.NewGuid();
        var milkIngredientId = Guid.NewGuid();
        var foamItem = InventoryItem.Create(foamIngredientId, 100, Now);
        var milkItem = InventoryItem.Create(milkIngredientId, 3, Now);
        _inventoryItemRepository.GetByIngredientIdAsync(foamIngredientId, Arg.Any<CancellationToken>()).Returns(foamItem);
        _inventoryItemRepository.GetByIngredientIdAsync(milkIngredientId, Arg.Any<CancellationToken>()).Returns(milkItem);

        var requested = new Dictionary<Guid, int> { [foamIngredientId] = 10, [milkIngredientId] = 10 };
        var act = () => _sut.ReserveForOrderAsync(Guid.NewGuid(), requested, Now, Now.AddHours(24), CancellationToken.None);

        await act.Should().ThrowAsync<InsufficientStockException>();
        foamItem.ReservedQuantity.Value.Should().Be(0, "the order-level reservation must be all-or-nothing, even though foam alone had enough stock");
        milkItem.ReservedQuantity.Value.Should().Be(0);
        _inventoryReservationRepository.DidNotReceive().Add(Arg.Any<InventoryReservation>());
    }

    [Fact]
    public async Task ReserveForOrderAsync_ExpiredActiveHoldOnTheSameItem_IsReclaimedBeforeCheckingAvailability()
    {
        var ingredientId = Guid.NewGuid();
        var item = InventoryItem.Create(ingredientId, 10, Now);
        var staleReservation = item.Reserve(Guid.NewGuid(), 8, Now, Now.AddHours(-1)); // already expired
        item.AvailableQuantity.Should().Be(2, "sanity check: 8 of 10 is held by the stale reservation");

        _inventoryItemRepository.GetByIngredientIdAsync(ingredientId, Arg.Any<CancellationToken>()).Returns(item);
        _inventoryReservationRepository.GetExpiredActiveByInventoryItemIdAsync(item.Id, Arg.Any<DateTimeOffset>(), Arg.Any<CancellationToken>())
            .Returns((IReadOnlyList<InventoryReservation>)[staleReservation]);

        await _sut.ReserveForOrderAsync(Guid.NewGuid(), new Dictionary<Guid, int> { [ingredientId] = 8 }, Now, Now.AddHours(24), CancellationToken.None);

        staleReservation.Status.Should().Be(InventoryReservationStatus.Expired);
        item.ReservedQuantity.Value.Should().Be(8, "the stale hold's 8 units were reclaimed, then immediately re-reserved for the new request");
    }

    [Fact]
    public async Task ReleaseForOrderAsync_ActiveReservationsForTheOrder_ReleasesEachOneAndReturnsStockToAvailable()
    {
        var ingredientId = Guid.NewGuid();
        var item = InventoryItem.Create(ingredientId, 10, Now);
        var orderId = Guid.NewGuid();
        var reservation = item.Reserve(orderId, 4, Now, Now.AddHours(24));
        item.ClearDomainEvents();

        _inventoryReservationRepository.GetActiveByOrderIdAsync(orderId, Arg.Any<CancellationToken>()).Returns((IReadOnlyList<InventoryReservation>)[reservation]);
        _inventoryItemRepository.GetByIdAsync(item.Id, Arg.Any<CancellationToken>()).Returns(item);

        await _sut.ReleaseForOrderAsync(orderId, Now.AddMinutes(5), CancellationToken.None);

        reservation.Status.Should().Be(InventoryReservationStatus.Released);
        item.ReservedQuantity.Value.Should().Be(0);
        item.AvailableQuantity.Should().Be(10);
    }

    [Fact]
    public async Task ReleaseForOrderAsync_NoActiveReservationsForTheOrder_IsANoOpNotAnError()
    {
        _inventoryReservationRepository.GetActiveByOrderIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((IReadOnlyList<InventoryReservation>)[]);

        var act = () => _sut.ReleaseForOrderAsync(Guid.NewGuid(), Now, CancellationToken.None);

        await act.Should().NotThrowAsync();
        _ = _inventoryItemRepository.DidNotReceive().GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ConsumeForOrderAsync_ActiveReservationsForTheOrder_DebitsStockAndRecordsATransaction()
    {
        var ingredientId = Guid.NewGuid();
        var item = InventoryItem.Create(ingredientId, 10, Now);
        var orderId = Guid.NewGuid();
        var reservation = item.Reserve(orderId, 4, Now, Now.AddHours(24));
        item.ClearDomainEvents();

        _inventoryReservationRepository.GetActiveByOrderIdAsync(orderId, Arg.Any<CancellationToken>()).Returns((IReadOnlyList<InventoryReservation>)[reservation]);
        _inventoryItemRepository.GetByIdAsync(item.Id, Arg.Any<CancellationToken>()).Returns(item);

        await _sut.ConsumeForOrderAsync(orderId, Now.AddMinutes(5), CancellationToken.None);

        reservation.Status.Should().Be(InventoryReservationStatus.Consumed);
        item.StockLevel.Value.Should().Be(6);
        item.ReservedQuantity.Value.Should().Be(0);
        _inventoryTransactionRepository.Received(1).Add(Arg.Is<InventoryTransaction>(t => t != null && t.QuantityDelta == -4 && t.Reason == InventoryReason.OrderConsumption && t.OrderId == orderId));
    }
}
