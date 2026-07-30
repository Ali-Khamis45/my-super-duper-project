using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Common;

/// <summary>
/// Per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md's frozen repository contract — deferred at
/// Sprint 5.1 (a two-aggregate Identity context didn't earn the indirection); built for real
/// now that three more aggregates (<c>Product</c>, <c>Category</c>, <c>Ingredient</c>) show the
/// shared shape actually holds. Matches Sprint 5.1's own <c>IUserRepository</c> precedent
/// exactly: a synchronous <c>Add</c> (EF Core's own <c>DbSet.Add</c> just marks state in
/// memory, no I/O until <c>SaveChangesAsync</c>), no separate <c>Update</c>/<c>Remove</c> — a
/// mutation is always a named method on the loaded aggregate itself, persisted by the
/// <c>UnitOfWorkBehavior</c> pipeline step, never a repository-level "generic patch."
/// </summary>
public interface IRepository<TAggregate, in TId>
    where TAggregate : AggregateRoot<TId>
    where TId : notnull
{
    Task<TAggregate?> GetByIdAsync(TId id, CancellationToken ct);

    void Add(TAggregate aggregate);
}
