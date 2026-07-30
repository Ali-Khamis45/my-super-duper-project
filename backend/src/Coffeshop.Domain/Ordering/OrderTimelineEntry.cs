using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Ordering;

/// <summary>
/// One entry in <see cref="Order"/>'s append-only timeline — appended automatically by every
/// status-changing method (<c>Submit</c>/<c>Cancel</c>/<c>MarkPaid</c>/<c>MarkCompleted</c>/
/// <c>Fail</c>), never inserted directly by a caller. This is the real, human-readable "what
/// happened to my order and when" record the brief's own Phase 1 names as <c>OrderTimeline</c>
/// and Phase 6 surfaces on the frontend's own Order Timeline UI — and, since every entry already
/// carries a real timestamp and status, it doubles as this aggregate's own audit trail
/// (<c>OrderAudit</c>, the brief's other named Phase 1 concern) without a second, parallel
/// logging structure: <see cref="Order"/> also inherits <c>AuditableEntity&lt;Guid&gt;</c>'s
/// <c>CreatedBy</c>/<c>ModifiedBy</c>/<c>CreatedAtUtc</c>/<c>ModifiedAtUtc</c> for "who and
/// when" at the row level, exactly like every other aggregate in this codebase — this timeline
/// is the "what, in what order" complement to that, not a duplicate of it.
/// </summary>
public sealed class OrderTimelineEntry : Entity<Guid>
{
    public OrderStatus Status { get; private set; }

    public DateTimeOffset OccurredAtUtc { get; private set; }

    public string? Note { get; private set; }

    // Real bug caught during Phase 4 live verification: Create() and Submit() (and every other
    // status transition) are called from the same application-layer handler with the exact same
    // `DateTimeOffset occurredAtUtc` value, so two entries can — and in the one real "create and
    // submit atomically" flow, always do — tie on OccurredAtUtc. Sorting a tied timestamp isn't
    // guaranteed to preserve append order once round-tripped through the database, so a real,
    // explicit ordinal (not the timestamp) is what callers should sort by.
    public int Sequence { get; private set; }

    private OrderTimelineEntry()
    {
    }

    internal static OrderTimelineEntry Create(OrderStatus status, DateTimeOffset occurredAtUtc, string? note, int sequence) =>
        new()
        {
            Id = Guid.NewGuid(),
            Status = status,
            OccurredAtUtc = occurredAtUtc,
            Note = note,
            Sequence = sequence,
        };
}
