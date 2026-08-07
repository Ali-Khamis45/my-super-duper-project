using Coffeshop.Domain.Inventory;
using Coffeshop.Domain.Inventory.Exceptions;
using FluentAssertions;
using Xunit;

namespace Coffeshop.Domain.Tests.Inventory;

public sealed class InventoryReservationTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private static InventoryReservation NewActiveReservation() =>
        InventoryItem.Create(Guid.NewGuid(), 10, Now).Reserve(Guid.NewGuid(), 3, Now, Now.AddHours(24));

    [Fact]
    public void Consume_FromActive_TransitionsAndSetsClosedAtUtc()
    {
        var reservation = NewActiveReservation();
        reservation.Consume(Now.AddMinutes(5));

        reservation.Status.Should().Be(InventoryReservationStatus.Consumed);
        reservation.ClosedAtUtc.Should().Be(Now.AddMinutes(5));
    }

    [Fact]
    public void Release_FromActive_Transitions()
    {
        var reservation = NewActiveReservation();
        reservation.Release(Now.AddMinutes(5));
        reservation.Status.Should().Be(InventoryReservationStatus.Released);
    }

    [Fact]
    public void Expire_FromActive_Transitions()
    {
        var reservation = NewActiveReservation();
        reservation.Expire(Now.AddHours(25));
        reservation.Status.Should().Be(InventoryReservationStatus.Expired);
    }

    [Fact]
    public void Consume_AlreadyConsumed_ThrowsInvalidReservationStatusException()
    {
        var reservation = NewActiveReservation();
        reservation.Consume(Now);

        var act = () => reservation.Consume(Now);
        act.Should().Throw<InvalidReservationStatusException>();
    }

    [Fact]
    public void Release_AlreadyReleased_ThrowsInvalidReservationStatusException()
    {
        var reservation = NewActiveReservation();
        reservation.Release(Now);

        var act = () => reservation.Release(Now);
        act.Should().Throw<InvalidReservationStatusException>();
    }

    [Fact]
    public void IsExpired_PastExpiryWhileActive_ReturnsTrue()
    {
        var reservation = NewActiveReservation();
        reservation.IsExpired(Now.AddHours(25)).Should().BeTrue();
    }

    [Fact]
    public void IsExpired_BeforeExpiry_ReturnsFalse()
    {
        var reservation = NewActiveReservation();
        reservation.IsExpired(Now.AddHours(1)).Should().BeFalse();
    }

    [Fact]
    public void IsExpired_AlreadyConsumed_NeverReportsExpiredRegardlessOfTime()
    {
        var reservation = NewActiveReservation();
        reservation.Consume(Now);
        reservation.IsExpired(Now.AddDays(365)).Should().BeFalse();
    }
}
