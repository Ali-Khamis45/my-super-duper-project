using Coffeshop.Application.Payments.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Payments;

/// <summary>
/// A narrow, deliberate exception to this project's own "exactly one <c>SaveChangesAsync</c> per
/// request, run by <c>UnitOfWorkBehavior</c>" rule — the same class of documented exception
/// Sprint 5.3's Order+Coupon scenario already established for a real, narrow reason. Reserving a
/// webhook event id has to commit atomically and immediately, independent of whatever the rest
/// of <c>ProcessPaymentWebhookCommandHandler</c> does afterward: two concurrent deliveries of the
/// same event must never both pass a not-yet-committed check and both proceed to capture the
/// same <c>Payment</c>. The real backstop is <see cref="ProcessedWebhookEventConfiguration"/>'s
/// primary key on <c>EventId</c> — the existence check below is an optimization to avoid a
/// round trip to the database throwing in the common case, not the actual guarantee.
/// </summary>
public sealed class IdempotencyStore(CoffeshopDbContext context) : IIdempotencyStore
{
    public async Task<bool> TryReserveAsync(string key, CancellationToken ct)
    {
        if (await context.ProcessedWebhookEvents.AsNoTracking().AnyAsync(e => e.EventId == key, ct))
        {
            return false;
        }

        var entry = context.ProcessedWebhookEvents.Add(new ProcessedWebhookEvent { EventId = key, ProcessedAtUtc = DateTimeOffset.UtcNow });

        try
        {
            await context.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateException)
        {
            // A genuine race: two concurrent webhook deliveries for the same event id both
            // passed the AnyAsync check above before either one's insert committed — the
            // primary key is what actually decides the winner, this is just the loser's own
            // safe, correct report that the key is already reserved. Detach the failed insert so
            // this same (scoped, request-lifetime) DbContext instance stays usable for the rest
            // of the handler's own real work.
            entry.State = EntityState.Detached;
            return false;
        }
    }
}
