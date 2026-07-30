using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Domain.Ordering;
using Coffeshop.Domain.Ordering.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Repositories;

public sealed class OrderRepository(CoffeshopDbContext context) : IOrderRepository
{
    public Task<Order?> GetByIdAsync(Guid id, CancellationToken ct) =>
        context.Orders.FirstOrDefaultAsync(o => o.Id == id, ct);

    public async Task<(IReadOnlyList<Order> Items, int TotalCount)> GetPagedAsync(OrderFilter filter, OrderSortBy sortBy, int skip, int take, CancellationToken ct)
    {
        var query = ApplyFilter(context.Orders.AsNoTracking(), filter);

        var totalCount = await query.CountAsync(ct);

        query = sortBy switch
        {
            OrderSortBy.Oldest => query.OrderBy(o => o.CreatedAtUtc),
            _ => query.OrderByDescending(o => o.CreatedAtUtc),
        };

        var items = await query.Skip(skip).Take(take).ToListAsync(ct);
        return (items, totalCount);
    }

    /// <summary>
    /// <c>Database.SqlQuery&lt;T&gt;</c> — EF Core's own managed raw-SQL query API, not a manual
    /// <c>DbConnection</c>/<c>DbCommand</c> (which would fight EF's own connection lifecycle
    /// management within the same `DbContext`/transaction this call runs inside). A sequence
    /// `nextval()` is atomic under concurrent callers by Postgres's own guarantee — no explicit
    /// locking needed here, the entire reason this project reaches for a real sequence instead
    /// of a hand-rolled "max + 1" counter.
    /// </summary>
    public async Task<long> NextOrderNumberAsync(CancellationToken ct)
    {
        var results = await context.Database.SqlQuery<long>($"SELECT nextval('order_number_seq') AS \"Value\"").ToListAsync(ct);
        return results[0];
    }

    public void Add(Order order) => context.Orders.Add(order);

    public Task<Order?> GetByIdempotencyKeyAsync(string idempotencyKey, CancellationToken ct) =>
        context.Orders.FirstOrDefaultAsync(o => o.IdempotencyKey == idempotencyKey, ct);

    private static IQueryable<Order> ApplyFilter(IQueryable<Order> query, OrderFilter filter)
    {
        if (filter.CustomerId.HasValue)
        {
            query = query.Where(o => o.CustomerId == filter.CustomerId.Value);
        }

        if (filter.Status.HasValue)
        {
            query = query.Where(o => o.Status == filter.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            // A real, live-verified EF Core limitation (Phase 4 manual testing): unlike
            // `p.Sku.Value` — never even attempted for search in `ProductRepository.ApplyFilter`,
            // per that method's own comment — `EF.Property<string>(o, nameof(Order.OrderNumber))`
            // looked like the fix for the same class of bug, compiled, but still 500'd at
            // runtime. EF's query translation resolves `EF.Property<string>` by the model's
            // `IProperty` metadata (found by name), which still carries `OrderNumber`'s
            // `HasConversion` — the ILIKE pattern literal then gets run through that same
            // converter and blows up trying to convert a plain search string as if it were an
            // `OrderNumber`. There's no known-working partial-match translation for a
            // `HasConversion`-mapped column, so this searches the two real plain-string fields
            // (`GuestName`/`GuestEmail`) by partial match, and `OrderNumber` by *exact* match —
            // translates fine, since whole-value equality (not `.Value` member access) is exactly
            // what already works for `Sku` today. Covers the one real staff workflow this needs:
            // pasting the exact order number from a receipt, or typing a guest's name/email.
            var trimmed = filter.SearchTerm.Trim();
            var term = $"%{trimmed}%";

            query = OrderNumber.TryParse(trimmed, out var orderNumber)
                ? query.Where(o => o.OrderNumber == orderNumber || EF.Functions.ILike(o.GuestInfo!.Name!, term) || EF.Functions.ILike(o.GuestInfo!.Email!, term))
                : query.Where(o => EF.Functions.ILike(o.GuestInfo!.Name!, term) || EF.Functions.ILike(o.GuestInfo!.Email!, term));
        }

        return query;
    }
}
