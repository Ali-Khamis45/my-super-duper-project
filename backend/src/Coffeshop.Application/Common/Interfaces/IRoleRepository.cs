using Coffeshop.Domain.Identity;

namespace Coffeshop.Application.Common.Interfaces;

public interface IRoleRepository
{
    Task<RoleDefinition?> GetByIdAsync(Guid id, CancellationToken ct);

    Task<RoleDefinition?> GetByNameAsync(string name, CancellationToken ct);

    Task<IReadOnlyList<RoleDefinition>> GetByIdsAsync(IEnumerable<Guid> ids, CancellationToken ct);
}
