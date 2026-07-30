using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Ordering.Events;

/// <summary>Payload shapes per this sprint's own Phase 8 event list — <c>order:created</c> maps to this, not a separate "OrderDrafted"; the frozen docs/32_COMMERCE_EVENT_CATALOG.md sketch named the equivalent moment <c>OrderPlaced</c>, which this sprint's real two-step Create-then-Submit lifecycle splits into two real, distinct events instead (see <see cref="OrderSubmittedEvent"/>).</summary>
public sealed record OrderCreatedEvent(Guid OrderId, string OrderNumber) : DomainEvent;

public sealed record OrderItemAddedEvent(Guid OrderId, Guid OrderItemId, Guid ProductId, int Quantity) : DomainEvent;

public sealed record OrderItemRemovedEvent(Guid OrderId, Guid OrderItemId) : DomainEvent;

public sealed record OrderSubmittedEvent(Guid OrderId, string OrderNumber, decimal Total) : DomainEvent;

public sealed record OrderCancelledEvent(Guid OrderId, string? Reason) : DomainEvent;

public sealed record OrderPaidEvent(Guid OrderId, decimal Total) : DomainEvent;

public sealed record OrderCompletedEvent(Guid OrderId) : DomainEvent;

public sealed record OrderFailedEvent(Guid OrderId, string Reason) : DomainEvent;
