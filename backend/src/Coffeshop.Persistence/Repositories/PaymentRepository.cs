using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Domain.Payments;
using Coffeshop.Domain.Payments.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Repositories;

public sealed class PaymentRepository(CoffeshopDbContext context) : IPaymentRepository
{
    public Task<Payment?> GetByIdAsync(Guid id, CancellationToken ct) =>
        context.Payments.FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<Payment?> GetByOrderIdAsync(Guid orderId, CancellationToken ct) =>
        context.Payments.FirstOrDefaultAsync(p => p.OrderId == orderId, ct);

    public Task<Payment?> GetByIdempotencyKeyAsync(string idempotencyKey, CancellationToken ct)
    {
        // Compares the whole converted VO (constructed client-side, outside the expression
        // tree), never a `.Value` member access inside the LINQ predicate — the same
        // `o.OrderNumber == orderNumber` pattern OrderRepository's own search branch already
        // proves translates against a `HasConversion`-mapped property; a real, live-verified EF
        // Core limitation (Sprint 5.4's own InventoryItemRepository finding) is that `.Value`
        // access specifically inside an expression tree does not reliably translate.
        var key = IdempotencyKey.Create(idempotencyKey);
        return context.Payments.FirstOrDefaultAsync(p => p.IdempotencyKey == key, ct);
    }

    public void Add(Payment payment) => context.Payments.Add(payment);

    public async Task<(IReadOnlyList<Payment> Items, int TotalCount)> GetPagedAsync(PaymentFilter filter, int skip, int take, CancellationToken ct)
    {
        var query = context.Payments.AsNoTracking().AsQueryable();

        if (filter.Status.HasValue)
        {
            query = query.Where(p => p.Status == filter.Status.Value);
        }

        if (filter.OrderId.HasValue)
        {
            query = query.Where(p => p.OrderId == filter.OrderId.Value);
        }

        if (filter.CustomerId.HasValue)
        {
            // Payment carries no CustomerId of its own — a real join against Orders (the same
            // database, the same DbContext), never a denormalized copy. Matches
            // InventoryItemRepository's own precedent for joining into a sibling bounded
            // context's table for a real filter need.
            var customerOrderIds = context.Orders.AsNoTracking().Where(o => o.CustomerId == filter.CustomerId.Value).Select(o => o.Id);
            query = query.Where(p => customerOrderIds.Contains(p.OrderId));
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            // Exact match only — the same "whole-value equality is what actually translates
            // against a HasConversion-mapped column" limitation OrderRepository's own ApplyFilter
            // comment documents for OrderNumber (never `.Value`, see GetByIdempotencyKeyAsync's
            // own comment above). A staff member pastes a real order number or payment id from a
            // receipt/admin screen, not a fuzzy fragment.
            var term = filter.Search.Trim();
            var paymentIdParsed = Guid.TryParse(term, out var paymentId);
            var orderNumberParsed = Domain.Ordering.ValueObjects.OrderNumber.TryParse(term, out var orderNumber);

            var matchingOrderIds = orderNumberParsed
                ? context.Orders.AsNoTracking().Where(o => o.OrderNumber == orderNumber).Select(o => o.Id)
                : Enumerable.Empty<Guid>().AsQueryable();

            query = paymentIdParsed
                ? query.Where(p => p.Id == paymentId || matchingOrderIds.Contains(p.OrderId))
                : query.Where(p => matchingOrderIds.Contains(p.OrderId));
        }

        var totalCount = await query.CountAsync(ct);
        var items = await query.OrderByDescending(p => p.CreatedAtUtc).Skip(skip).Take(take).ToListAsync(ct);

        return (items, totalCount);
    }
}
