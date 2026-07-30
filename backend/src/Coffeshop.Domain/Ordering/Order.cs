using Coffeshop.Domain.Catalog.ValueObjects;
using Coffeshop.Domain.Ordering.Events;
using Coffeshop.Domain.Ordering.Exceptions;
using Coffeshop.Domain.Ordering.ValueObjects;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Ordering;

/// <summary>
/// The Ordering bounded context's aggregate root. Deliberately no separate backend <c>Cart</c>
/// aggregate — the frozen Milestone 5 Phase 0 sketch (docs/30_COMMERCE_DDD_MODEL.md) modeled
/// <c>Cart</c>/<c>Order</c> as two aggregates with an explicit conversion step; this sprint's
/// real brief has no <c>Cart</c> in its Phase 1 list at all, because the frontend's own
/// `stores/cart-store.ts` (real, `localStorage`-backed, shipped since Sprint 3.6) already *is*
/// the cart — "Connect frontend Cart with backend" (the brief's own Phase 5 heading) means
/// submitting that existing cart directly via `CreateOrderFromCartCommand`, not building a
/// second, server-side mirror of it. Documented as a deliberate, reasoned deviation from the
/// original sketch, per this sprint's own "documentation follows implementation" rule — not a
/// silent departure from it.
///
/// <c>OrderNumber</c> is assigned once, at <see cref="Create"/> (a real Postgres sequence value,
/// fetched by the application handler before calling this factory) — not deferred until
/// <see cref="Submit"/>. Every real usage this sprint creates and submits an order atomically in
/// one command (<c>CreateOrderFromCartCommand</c>); a genuinely separate "build a draft over
/// multiple requests, submit later" flow has no real frontend caller, so deferring the number
/// assignment to guard against that case would have been speculative complexity for a scenario
/// that doesn't exist yet.
/// </summary>
public sealed class Order : AuditableEntity<Guid>
{
    private readonly List<OrderItem> _items = [];
    private readonly List<OrderTimelineEntry> _timeline = [];

    public OrderNumber OrderNumber { get; private set; } = null!;

    public OrderStatus Status { get; private set; }

    public Guid? CustomerId { get; private set; }

    public GuestOrderInfo? GuestInfo { get; private set; }

    public FulfillmentMethod FulfillmentMethod { get; private set; }

    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();

    public OrderTotals Totals { get; private set; } = null!;

    public IReadOnlyCollection<OrderTimelineEntry> Timeline => _timeline.AsReadOnly();

    public string? CancellationReason { get; private set; }

    public string? FailureReason { get; private set; }

    /// <summary>
    /// Additive (Phase 10 — a real bug found and fixed during this sprint's own adversarial
    /// review, not a speculative feature): client-supplied, unique per real checkout attempt —
    /// a double-click or a network-level retry that resends the exact same
    /// <c>CreateOrderFromCartCommand</c> request must never create two orders for what was, from
    /// the customer's perspective, one "Place Order" click. <c>CreateOrderFromCartCommandHandler</c>
    /// checks for an existing order with this key *before* consuming a sequence value or doing
    /// any pricing work, and returns the already-created order instead of a new one. Nullable —
    /// a value only exists for orders created through the real checkout flow that started
    /// sending one; nothing else in this codebase creates an `Order` without going through that
    /// handler.
    /// </summary>
    public string? IdempotencyKey { get; private set; }

    private Order()
    {
    }

    public static Order Create(OrderNumber orderNumber, Guid? customerId, GuestOrderInfo? guestInfo, FulfillmentMethod fulfillmentMethod, DateTimeOffset occurredAtUtc, string? idempotencyKey = null)
    {
        if (customerId is null == guestInfo is null)
        {
            throw new InvalidOrderIdentityException("An order needs exactly one identity — a signed-in customer or real guest contact info, never both, never neither.");
        }

        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = orderNumber,
            Status = OrderStatus.Draft,
            CustomerId = customerId,
            GuestInfo = guestInfo,
            FulfillmentMethod = fulfillmentMethod,
            Totals = OrderTotals.FromLineTotals([]),
            IdempotencyKey = idempotencyKey,
        };

        order.AppendTimelineEntry(OrderStatus.Draft, occurredAtUtc, null);
        order.AddDomainEvent(new OrderCreatedEvent(order.Id, order.OrderNumber.Value));
        return order;
    }

    public OrderItem AddItem(Guid productId, string productName, string sku, RecipeSelection selection, Money unitPrice, int quantity, string? recommendationId)
    {
        EnsureDraft();

        var item = OrderItem.Create(productId, productName, sku, selection, unitPrice, quantity, recommendationId);
        _items.Add(item);
        RecalculateTotals();
        AddDomainEvent(new OrderItemAddedEvent(Id, item.Id, productId, quantity));
        return item;
    }

    public void RemoveItem(Guid orderItemId)
    {
        EnsureDraft();

        var item = _items.FirstOrDefault(i => i.Id == orderItemId) ?? throw new OrderItemNotFoundException();
        _items.Remove(item);
        RecalculateTotals();
        AddDomainEvent(new OrderItemRemovedEvent(Id, orderItemId));
    }

    public void UpdateQuantity(Guid orderItemId, int quantity)
    {
        EnsureDraft();

        var item = _items.FirstOrDefault(i => i.Id == orderItemId) ?? throw new OrderItemNotFoundException();
        item.UpdateQuantity(quantity);
        RecalculateTotals();
    }

    public void Submit(DateTimeOffset occurredAtUtc)
    {
        EnsureDraft();

        if (_items.Count == 0)
        {
            throw new EmptyOrderException();
        }

        Status = OrderStatus.Submitted;
        AppendTimelineEntry(OrderStatus.Submitted, occurredAtUtc, null);
        AddDomainEvent(new OrderSubmittedEvent(Id, OrderNumber.Value, Totals.Total.Amount));
    }

    /// <summary>Cancellable while <see cref="OrderStatus.Draft"/>, <see cref="OrderStatus.Submitted"/>, or <see cref="OrderStatus.Paid"/> — matching the frozen sketch's own "pre-preparation window" reasoning: once genuinely <see cref="OrderStatus.Completed"/>, cancellation no longer makes sense (that's a refund, a real capability this sprint doesn't build — no <c>Payment</c> aggregate exists yet to refund against).</summary>
    public void Cancel(DateTimeOffset occurredAtUtc, string? reason)
    {
        if (Status is not (OrderStatus.Draft or OrderStatus.Submitted or OrderStatus.Paid))
        {
            throw new InvalidOrderStatusTransitionException($"An order in '{Status}' status can no longer be cancelled.");
        }

        Status = OrderStatus.Cancelled;
        CancellationReason = reason;
        AppendTimelineEntry(OrderStatus.Cancelled, occurredAtUtc, reason);
        AddDomainEvent(new OrderCancelledEvent(Id, reason));
    }

    public void MarkPaid(DateTimeOffset occurredAtUtc)
    {
        if (Status != OrderStatus.Submitted)
        {
            throw new InvalidOrderStatusTransitionException($"Only a submitted order can be marked paid — this order is '{Status}'.");
        }

        Status = OrderStatus.Paid;
        AppendTimelineEntry(OrderStatus.Paid, occurredAtUtc, null);
        AddDomainEvent(new OrderPaidEvent(Id, Totals.Total.Amount));
    }

    public void MarkCompleted(DateTimeOffset occurredAtUtc)
    {
        if (Status != OrderStatus.Paid)
        {
            throw new InvalidOrderStatusTransitionException($"Only a paid order can be marked completed — this order is '{Status}'.");
        }

        Status = OrderStatus.Completed;
        AppendTimelineEntry(OrderStatus.Completed, occurredAtUtc, null);
        AddDomainEvent(new OrderCompletedEvent(Id));
    }

    /// <summary>A submitted order that couldn't be paid (e.g. an admin-recorded payment failure) — the one branch that doesn't reach <see cref="OrderStatus.Cancelled"/>, since "we tried to charge this and it didn't work" is a real, distinct outcome from "the customer/admin chose to cancel."</summary>
    public void Fail(DateTimeOffset occurredAtUtc, string reason)
    {
        if (Status != OrderStatus.Submitted)
        {
            throw new InvalidOrderStatusTransitionException($"Only a submitted order can fail — this order is '{Status}'.");
        }

        Status = OrderStatus.Failed;
        FailureReason = reason;
        AppendTimelineEntry(OrderStatus.Failed, occurredAtUtc, reason);
        AddDomainEvent(new OrderFailedEvent(Id, reason));
    }

    private void EnsureDraft()
    {
        if (Status != OrderStatus.Draft)
        {
            throw new OrderNotEditableException();
        }
    }

    private void RecalculateTotals() => Totals = OrderTotals.FromLineTotals(_items.Select(i => i.LineTotal));

    private void AppendTimelineEntry(OrderStatus status, DateTimeOffset occurredAtUtc, string? note) =>
        _timeline.Add(OrderTimelineEntry.Create(status, occurredAtUtc, note, _timeline.Count));
}
