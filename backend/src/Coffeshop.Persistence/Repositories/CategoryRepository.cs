using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Repositories;

public sealed class CategoryRepository(CoffeshopDbContext context) : ICategoryRepository
{
    public Task<Category?> GetByIdAsync(Guid id, CancellationToken ct) =>
        context.Categories.FirstOrDefaultAsync(c => c.Id == id, ct);

    public Task<Category?> GetByCodeAsync(string code, CancellationToken ct)
    {
        var normalized = code.Trim().ToLowerInvariant();
        return context.Categories.FirstOrDefaultAsync(c => c.Code == normalized, ct);
    }

    public Task<bool> ExistsByCodeAsync(string code, CancellationToken ct)
    {
        var normalized = code.Trim().ToLowerInvariant();
        return context.Categories.AnyAsync(c => c.Code == normalized, ct);
    }

    public async Task<IReadOnlyList<Category>> GetAllAsync(CancellationToken ct) =>
        await context.Categories.AsNoTracking().ToListAsync(ct);

    public void Add(Category category) => context.Categories.Add(category);
}
