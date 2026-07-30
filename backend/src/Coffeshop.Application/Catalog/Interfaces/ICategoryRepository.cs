using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Common;

namespace Coffeshop.Application.Catalog.Interfaces;

public interface ICategoryRepository : IRepository<Category, Guid>
{
    Task<Category?> GetByCodeAsync(string code, CancellationToken ct);

    Task<bool> ExistsByCodeAsync(string code, CancellationToken ct);

    Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken ct);
}
