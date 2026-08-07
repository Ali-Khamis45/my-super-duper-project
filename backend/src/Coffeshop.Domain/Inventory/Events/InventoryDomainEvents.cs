using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Inventory.Events;

/// <summary>Payload shapes per this sprint's own Phase 8 event list — see docs/32_COMMERCE_EVENT_CATALOG.md for the full catalog entry.</summary>
public sealed record InventoryItemCreatedEvent(Guid InventoryItemId, Guid IngredientId) : DomainEvent;

public sealed record InventoryReservedEvent(Guid InventoryItemId, Guid IngredientId, Guid ReservationId, Guid OrderId, int Quantity) : DomainEvent;

public sealed record InventoryReservationCreatedEvent(Guid ReservationId, Guid InventoryItemId, Guid OrderId, int Quantity) : DomainEvent;

/// <summary>Raised instead of <see cref="InventoryReservedEvent"/> when a reservation attempt fails for real, live-verifiable reasons (insufficient stock) — a real, additive event this sprint's own event-catalog brief names, not silently folded into the exception alone.</summary>
public sealed record InventoryReservationFailedEvent(Guid IngredientId, Guid OrderId, int RequestedQuantity, int AvailableQuantity) : DomainEvent;

public sealed record InventoryReleasedEvent(Guid InventoryItemId, Guid IngredientId, Guid ReservationId, Guid OrderId, int Quantity) : DomainEvent;

public sealed record InventoryReservationExpiredEvent(Guid ReservationId, Guid InventoryItemId, Guid OrderId, int Quantity) : DomainEvent;

public sealed record InventoryConsumedEvent(Guid InventoryItemId, Guid IngredientId, Guid OrderId, int Quantity, int NewStockLevel) : DomainEvent;

public sealed record InventoryRestockedEvent(Guid InventoryItemId, Guid IngredientId, int Quantity, int NewStockLevel) : DomainEvent;

public sealed record InventoryAdjustedEvent(Guid InventoryItemId, Guid IngredientId, int Delta, int NewStockLevel, string Reason) : DomainEvent;

public sealed record InventoryLowStockEvent(Guid InventoryItemId, Guid IngredientId, int AvailableQuantity, int Threshold) : DomainEvent;

public sealed record InventoryOutOfStockEvent(Guid InventoryItemId, Guid IngredientId) : DomainEvent;

public sealed record InventoryBackInStockEvent(Guid InventoryItemId, Guid IngredientId) : DomainEvent;
