using Coffeshop.Domain.Common;
using Coffeshop.Domain.Payments;

namespace Coffeshop.Application.Payments.Interfaces;

public sealed record PaymentFilter(PaymentStatus? Status = null, Guid? CustomerId = null, Guid? OrderId = null, string? Search = null);

/// <summary>Extends <see cref="IRepository{TAggregate,TId}"/> additively, matching every other repository in this codebase.</summary>
public interface IPaymentRepository : IRepository<Payment, Guid>
{
    /// <summary>One <see cref="Payment"/> per <c>Order</c> — the real, load-bearing lookup every command in this bounded context starts from (a request always names an order, never a bare payment id, except the narrow admin/receipt lookups that already have the payment id from a prior response).</summary>
    Task<Payment?> GetByOrderIdAsync(Guid orderId, CancellationToken ct);

    Task<Payment?> GetByIdempotencyKeyAsync(string idempotencyKey, CancellationToken ct);

    Task<(IReadOnlyList<Payment> Items, int TotalCount)> GetPagedAsync(PaymentFilter filter, int skip, int take, CancellationToken ct);
}
