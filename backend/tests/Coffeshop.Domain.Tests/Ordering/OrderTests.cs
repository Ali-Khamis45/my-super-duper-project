using Coffeshop.Domain.Catalog.ValueObjects;
using Coffeshop.Domain.Ordering;
using Coffeshop.Domain.Ordering.Events;
using Coffeshop.Domain.Ordering.Exceptions;
using Coffeshop.Domain.Ordering.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Coffeshop.Domain.Tests.Ordering;

public sealed class OrderTests
{
    private static readonly DateTimeOffset Now = new(2026, 7, 30, 12, 0, 0, TimeSpan.Zero);

    private static Order CreateGuestOrder() =>
        Order.Create(OrderNumber.FromSequenceValue(1), null, GuestOrderInfo.Create("Ada Lovelace", "ada@example.com"), FulfillmentMethod.Pickup, Now);

    private static RecipeSelection ValidSelection() =>
        RecipeSelection.Create("cream", "medium", "kraft", "classic", "classic", "glossy", [new RecipeIngredientPlacement("syrup", 1)]);

    [Fact]
    public void Create_GuestOrder_StartsAsDraftWithZeroTotals()
    {
        var order = CreateGuestOrder();

        order.Status.Should().Be(OrderStatus.Draft);
        order.Totals.Total.Amount.Should().Be(0);
        order.Timeline.Should().ContainSingle(e => e.Status == OrderStatus.Draft);
        order.DomainEvents.Should().ContainSingle(e => e is OrderCreatedEvent);
    }

    [Fact]
    public void Create_BothCustomerIdAndGuestInfo_ThrowsInvalidOrderIdentityException()
    {
        var act = () => Order.Create(OrderNumber.FromSequenceValue(1), Guid.NewGuid(), GuestOrderInfo.Create("Ada", "ada@example.com"), FulfillmentMethod.Pickup, Now);

        act.Should().Throw<InvalidOrderIdentityException>();
    }

    [Fact]
    public void Create_NeitherCustomerIdNorGuestInfo_ThrowsInvalidOrderIdentityException()
    {
        var act = () => Order.Create(OrderNumber.FromSequenceValue(1), null, null, FulfillmentMethod.Pickup, Now);

        act.Should().Throw<InvalidOrderIdentityException>();
    }

    [Fact]
    public void AddItem_RecalculatesTotals()
    {
        var order = CreateGuestOrder();

        order.AddItem(Guid.NewGuid(), "Classic Espresso", "ESP-001", ValidSelection(), Money.Create(3.50m), 2, null);

        order.Totals.Total.Amount.Should().Be(7.00m);
        order.Items.Should().ContainSingle();
    }

    [Fact]
    public void AddItem_MultipleLines_TotalsSumEveryLine()
    {
        var order = CreateGuestOrder();

        order.AddItem(Guid.NewGuid(), "Classic Espresso", "ESP-001", ValidSelection(), Money.Create(3.50m), 1, null);
        order.AddItem(Guid.NewGuid(), "Mocha", "MOC-001", ValidSelection(), Money.Create(5.00m), 2, "rec-1");

        order.Totals.Total.Amount.Should().Be(3.50m + 5.00m * 2);
    }

    [Fact]
    public void RemoveItem_RecalculatesTotals()
    {
        var order = CreateGuestOrder();
        var item = order.AddItem(Guid.NewGuid(), "Classic Espresso", "ESP-001", ValidSelection(), Money.Create(3.50m), 1, null);
        order.AddItem(Guid.NewGuid(), "Mocha", "MOC-001", ValidSelection(), Money.Create(5.00m), 1, null);

        order.RemoveItem(item.Id);

        order.Items.Should().ContainSingle(i => i.ProductName == "Mocha");
        order.Totals.Total.Amount.Should().Be(5.00m);
    }

    [Fact]
    public void UpdateQuantity_RecalculatesTotals()
    {
        var order = CreateGuestOrder();
        var item = order.AddItem(Guid.NewGuid(), "Classic Espresso", "ESP-001", ValidSelection(), Money.Create(3.50m), 1, null);

        order.UpdateQuantity(item.Id, 3);

        order.Totals.Total.Amount.Should().Be(10.50m);
    }

    [Fact]
    public void Submit_EmptyOrder_ThrowsEmptyOrderException()
    {
        var order = CreateGuestOrder();

        var act = () => order.Submit(Now);

        act.Should().Throw<EmptyOrderException>();
    }

    [Fact]
    public void Submit_WithItems_TransitionsToSubmittedAndRaisesEvent()
    {
        var order = CreateGuestOrder();
        order.AddItem(Guid.NewGuid(), "Classic Espresso", "ESP-001", ValidSelection(), Money.Create(3.50m), 1, null);

        order.Submit(Now);

        order.Status.Should().Be(OrderStatus.Submitted);
        order.DomainEvents.Should().Contain(e => e is OrderSubmittedEvent);
        order.Timeline.Should().Contain(e => e.Status == OrderStatus.Submitted);
    }

    [Theory]
    [MemberData(nameof(MutatingActions))]
    public void SubmittedOrder_AnyDraftMutation_ThrowsOrderNotEditableException(Action<Order> mutate)
    {
        var order = CreateGuestOrder();
        order.AddItem(Guid.NewGuid(), "Classic Espresso", "ESP-001", ValidSelection(), Money.Create(3.50m), 1, null);
        order.Submit(Now);

        var act = () => mutate(order);

        act.Should().Throw<OrderNotEditableException>();
    }

    public static TheoryData<Action<Order>> MutatingActions => new()
    {
        o => o.AddItem(Guid.NewGuid(), "Mocha", "MOC-001", ValidSelection(), Money.Create(5.00m), 1, null),
        o => o.RemoveItem(o.Items.First().Id),
        o => o.UpdateQuantity(o.Items.First().Id, 5),
        o => o.Submit(Now),
    };

    [Fact]
    public void MarkPaid_FromSubmitted_Succeeds()
    {
        var order = CreateGuestOrder();
        order.AddItem(Guid.NewGuid(), "Classic Espresso", "ESP-001", ValidSelection(), Money.Create(3.50m), 1, null);
        order.Submit(Now);

        order.MarkPaid(Now);

        order.Status.Should().Be(OrderStatus.Paid);
        order.DomainEvents.Should().Contain(e => e is OrderPaidEvent);
    }

    [Fact]
    public void MarkPaid_FromDraft_ThrowsInvalidOrderStatusTransitionException()
    {
        var order = CreateGuestOrder();

        var act = () => order.MarkPaid(Now);

        act.Should().Throw<InvalidOrderStatusTransitionException>();
    }

    [Fact]
    public void MarkCompleted_FromPaid_Succeeds()
    {
        var order = CreateGuestOrder();
        order.AddItem(Guid.NewGuid(), "Classic Espresso", "ESP-001", ValidSelection(), Money.Create(3.50m), 1, null);
        order.Submit(Now);
        order.MarkPaid(Now);

        order.MarkCompleted(Now);

        order.Status.Should().Be(OrderStatus.Completed);
        order.DomainEvents.Should().Contain(e => e is OrderCompletedEvent);
    }

    [Fact]
    public void MarkCompleted_FromSubmitted_ThrowsInvalidOrderStatusTransitionException()
    {
        var order = CreateGuestOrder();
        order.AddItem(Guid.NewGuid(), "Classic Espresso", "ESP-001", ValidSelection(), Money.Create(3.50m), 1, null);
        order.Submit(Now);

        var act = () => order.MarkCompleted(Now);

        act.Should().Throw<InvalidOrderStatusTransitionException>();
    }

    [Fact]
    public void Fail_FromSubmitted_Succeeds()
    {
        var order = CreateGuestOrder();
        order.AddItem(Guid.NewGuid(), "Classic Espresso", "ESP-001", ValidSelection(), Money.Create(3.50m), 1, null);
        order.Submit(Now);

        order.Fail(Now, "Payment declined");

        order.Status.Should().Be(OrderStatus.Failed);
        order.FailureReason.Should().Be("Payment declined");
        order.DomainEvents.Should().Contain(e => e is OrderFailedEvent);
    }

    [Theory]
    [InlineData(OrderStatus.Draft)]
    [InlineData(OrderStatus.Submitted)]
    [InlineData(OrderStatus.Paid)]
    public void Cancel_FromCancellableStates_Succeeds(OrderStatus fromStatus)
    {
        var order = CreateGuestOrder();
        order.AddItem(Guid.NewGuid(), "Classic Espresso", "ESP-001", ValidSelection(), Money.Create(3.50m), 1, null);
        if (fromStatus is OrderStatus.Submitted or OrderStatus.Paid) order.Submit(Now);
        if (fromStatus is OrderStatus.Paid) order.MarkPaid(Now);

        order.Cancel(Now, "Changed my mind");

        order.Status.Should().Be(OrderStatus.Cancelled);
        order.CancellationReason.Should().Be("Changed my mind");
        order.DomainEvents.Should().Contain(e => e is OrderCancelledEvent);
    }

    [Fact]
    public void Cancel_FromCompleted_ThrowsInvalidOrderStatusTransitionException()
    {
        var order = CreateGuestOrder();
        order.AddItem(Guid.NewGuid(), "Classic Espresso", "ESP-001", ValidSelection(), Money.Create(3.50m), 1, null);
        order.Submit(Now);
        order.MarkPaid(Now);
        order.MarkCompleted(Now);

        var act = () => order.Cancel(Now, null);

        act.Should().Throw<InvalidOrderStatusTransitionException>();
    }
}
