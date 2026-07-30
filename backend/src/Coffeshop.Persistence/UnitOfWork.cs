using Coffeshop.Application.Common.Interfaces;

namespace Coffeshop.Persistence;

public sealed class UnitOfWork(CoffeshopDbContext context) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken ct) => context.SaveChangesAsync(ct);
}
