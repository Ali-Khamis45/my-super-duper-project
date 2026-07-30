namespace Coffeshop.Persistence.Outbox;

/// <summary>
/// The outbox table, per docs/32_COMMERCE_EVENT_CATALOG.md's outbox pattern — schema only
/// this sprint (docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's entity rules): every domain event
/// an aggregate raises is durably recorded here in the same transaction as the aggregate's own
/// state change, via <see cref="Interceptors.DomainEventsToOutboxInterceptor"/>. The Hangfire
/// dispatcher that polls and processes these rows is real Infrastructure work reserved for
/// Sprint 5.3+ once there are real cross-context consumers (Notifications, Analytics) — this
/// sprint has none yet (a fresh Identity context has no other bounded context to notify).
/// </summary>
public sealed class OutboxMessage
{
    public Guid Id { get; init; }

    public string EventType { get; init; } = null!;

    public string Payload { get; init; } = null!;

    public DateTimeOffset OccurredAtUtc { get; init; }

    public DateTimeOffset? ProcessedAtUtc { get; set; }
}
