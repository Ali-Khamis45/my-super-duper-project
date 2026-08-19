namespace Coffeshop.Persistence.Payments;

/// <summary>
/// The real, durable backing for <c>IIdempotencyStore</c> — one row per gateway webhook event id
/// ever successfully reserved. Schema-only, matching <c>OutboxMessage</c>'s own "a plain
/// persistence-only record, not a domain aggregate" precedent — nothing about "has this webhook
/// event been seen before" is a business invariant an aggregate enforces, it's infrastructure
/// bookkeeping.
/// </summary>
public sealed class ProcessedWebhookEvent
{
    public string EventId { get; init; } = null!;

    public DateTimeOffset ProcessedAtUtc { get; init; }
}
