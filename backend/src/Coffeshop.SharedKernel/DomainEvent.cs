namespace Coffeshop.SharedKernel;

/// <summary>
/// Base record for every concrete domain event — gives every event a stable id and
/// occurrence timestamp without each event type re-declaring them.
/// </summary>
public abstract record DomainEvent : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();

    public DateTimeOffset OccurredOnUtc { get; } = DateTimeOffset.UtcNow;
}
