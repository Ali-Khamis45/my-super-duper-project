using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Catalog.Events;

/// <summary>
/// Payload shapes per docs/32_COMMERCE_EVENT_CATALOG.md's Catalog row, extended additively
/// this sprint (`ProductUpdated`, `ProductPublished`, `ProductRestored`, `IngredientUpdated`
/// were not in the original 26-event table — new rows, no existing row changed, per
/// docs/37_API_STABILITY_POLICY.md's extension mechanism 2).
/// </summary>
public sealed record ProductCreatedEvent(Guid ProductId, string Sku, string Name) : DomainEvent;

public sealed record ProductUpdatedEvent(Guid ProductId) : DomainEvent;

public sealed record ProductPriceChangedEvent(Guid ProductId, decimal OldAmount, decimal NewAmount) : DomainEvent;

public sealed record ProductPublishedEvent(Guid ProductId) : DomainEvent;

public sealed record ProductArchivedEvent(Guid ProductId) : DomainEvent;

public sealed record ProductRestoredEvent(Guid ProductId) : DomainEvent;

/// <summary>
/// Additive (Sprint 5.2, Phase 8) — a real gap: `DeleteProductCommandHandler`'s hard delete
/// previously raised nothing, unlike every other product state transition. Carries `Sku`/`Name`
/// (unlike the other product events, which only carry `ProductId`) because the aggregate itself
/// is gone by the time this would ever be dispatched — a consumer reading this row later has no
/// other way to know which product it was.
/// </summary>
public sealed record ProductDeletedEvent(Guid ProductId, string Sku, string Name) : DomainEvent;

public sealed record CategoryCreatedEvent(Guid CategoryId, string Code, string Name) : DomainEvent;

public sealed record CategoryUpdatedEvent(Guid CategoryId) : DomainEvent;

public sealed record IngredientCreatedEvent(Guid IngredientId, string Code, string Name) : DomainEvent;

public sealed record IngredientUpdatedEvent(Guid IngredientId) : DomainEvent;
