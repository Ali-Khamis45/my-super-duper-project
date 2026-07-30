using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Domain.Identity;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Repositories;

public sealed class RoleRepository(CoffeshopDbContext context) : IRoleRepository
{
    public Task<RoleDefinition?> GetByIdAsync(Guid id, CancellationToken ct) =>
        context.Roles.FirstOrDefaultAsync(r => r.Id == id, ct);

    public Task<RoleDefinition?> GetByNameAsync(string name, CancellationToken ct) =>
        context.Roles.FirstOrDefaultAsync(r => r.Name == name, ct);

    public async Task<IReadOnlyList<RoleDefinition>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct)
    {
        var idList = ids as IReadOnlyCollection<Guid> ?? ids.ToList();
        return await context.Roles.Where(r => idList.Contains(r.Id)).ToListAsync(ct);
    }
}
