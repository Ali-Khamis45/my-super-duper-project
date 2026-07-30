using System.Text.Json;
using Coffeshop.Persistence.Outbox;
using Coffeshop.SharedKernel;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Coffeshop.Persistence.Interceptors;

/// <summary>
/// Drains every pending domain event off every tracked aggregate into
/// <see cref="OutboxMessage"/> rows, in the same <c>SavingChanges</c> call — so the event's
/// existence is exactly as durable as the state change that raised it, per
/// docs/32_COMMERCE_EVENT_CATALOG.md's outbox pattern.
/// </summary>
public sealed class DomainEventsToOutboxInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        AppendOutboxMessages(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        AppendOutboxMessages(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void AppendOutboxMessages(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        var aggregatesWithEvents = context.ChangeTracker.Entries<IHasDomainEvents>()
            .Select(e => e.Entity)
            .Where(entity => entity.DomainEvents.Count > 0)
            .ToList();

        foreach (var aggregate in aggregatesWithEvents)
        {
            foreach (var domainEvent in aggregate.DomainEvents)
            {
                context.Set<OutboxMessage>().Add(new OutboxMessage
                {
                    Id = domainEvent.EventId,
                    EventType = domainEvent.GetType().Name,
                    Payload = JsonSerializer.Serialize(domainEvent, domainEvent.GetType()),
                    OccurredAtUtc = domainEvent.OccurredOnUtc,
                });
            }

            aggregate.ClearDomainEvents();
        }
    }
}
