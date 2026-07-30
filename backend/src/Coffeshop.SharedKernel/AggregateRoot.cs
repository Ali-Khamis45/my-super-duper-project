namespace Coffeshop.SharedKernel;

/// <summary>
/// Non-generic so the SaveChanges interceptor can find every pending domain event across
/// aggregates regardless of their id type, without a runtime type-check per concrete
/// <c>AggregateRoot&lt;TId&gt;</c> instantiation.
/// </summary>
public interface IHasDomainEvents
{
    IReadOnlyCollection<IDomainEvent> DomainEvents { get; }

    void ClearDomainEvents();
}

/// <summary>
/// An aggregate root — the only kind of object a repository loads or saves, per the
/// "one aggregate per transaction" convention frozen in docs/30_COMMERCE_DDD_MODEL.md.
/// Raises domain events into an in-memory list; the SaveChanges interceptor
/// (Coffeshop.Persistence) drains it into the outbox in the same transaction as the
/// aggregate's own state change (docs/32_COMMERCE_EVENT_CATALOG.md).
/// </summary>
public abstract class AggregateRoot<TId> : Entity<TId>, IHasDomainEvents
    where TId : notnull
{
    private readonly List<IDomainEvent> _domainEvents = [];

    protected AggregateRoot()
    {
    }

    protected AggregateRoot(TId id)
        : base(id)
    {
    }

    public IReadOnlyCollection<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    protected void AddDomainEvent(IDomainEvent domainEvent) => _domainEvents.Add(domainEvent);

    public void ClearDomainEvents() => _domainEvents.Clear();
}
