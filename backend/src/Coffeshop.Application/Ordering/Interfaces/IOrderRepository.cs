using Coffeshop.Domain.Common;
using Coffeshop.Domain.Ordering;

namespace Coffeshop.Application.Ordering.Interfaces;

public sealed record OrderFilter(
    Guid? CustomerId = null,
    OrderStatus? Status = null,
    /// <summary>
    /// Exact match against the order number, `ILIKE` (partial match) against guest name/email —
    /// deliberately two different comparison strategies, not a uniform `ILIKE`. A real EF Core
    /// limitation found during Phase 4 live verification: `OrderNumber` is a `HasConversion`-
    /// mapped value object, and unlike a plain string column, no partial-match translation for it
    /// works (`OrderRepository.ApplyFilter`'s own comment has the full story) — only whole-value
    /// equality does, which is what this actually searches with when the term parses as a real
    /// order number.
    /// </summary>
    string? SearchTerm = null);

public enum OrderSortBy
{
    Newest,
    Oldest,
}

/// <summary>Extends <see cref="IRepository{TAggregate,TId}"/> additively, matching every other repository in this codebase.</summary>
public interface IOrderRepository : IRepository<Order, Guid>
{
    Task<(IReadOnlyList<Order> Items, int TotalCount)> GetPagedAsync(OrderFilter filter, OrderSortBy sortBy, int skip, int take, CancellationToken ct);

    /// <summary>A real Postgres sequence value (`order_number_seq`), not an application-computed number — see <c>Coffeshop.Domain.Ordering.ValueObjects.OrderNumber</c>'s own doc comment for why.</summary>
    Task<long> NextOrderNumberAsync(CancellationToken ct);

    /// <summary>Additive (Phase 10) — backs <c>CreateOrderFromCartCommandHandler</c>'s duplicate-submission check; see <c>Order.IdempotencyKey</c>'s own doc comment.</summary>
    Task<Order?> GetByIdempotencyKeyAsync(string idempotencyKey, CancellationToken ct);
}
