using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Domain.Catalog;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Repositories;

public sealed class IngredientRepository(CoffeshopDbContext context) : IIngredientRepository
{
    public Task<Ingredient?> GetByIdAsync(Guid id, CancellationToken ct) =>
        context.Ingredients.FirstOrDefaultAsync(i => i.Id == id, ct);

    public Task<Ingredient?> GetByCodeAsync(string code, CancellationToken ct)
    {
        var normalized = code.Trim().ToLowerInvariant();
        return context.Ingredients.FirstOrDefaultAsync(i => i.Code == normalized, ct);
    }

    public Task<bool> ExistsByCodeAsync(string code, CancellationToken ct)
    {
        var normalized = code.Trim().ToLowerInvariant();
        return context.Ingredients.AnyAsync(i => i.Code == normalized, ct);
    }

    public async Task<IReadOnlyList<Ingredient>> GetAllAsync(CancellationToken ct) =>
        await context.Ingredients.AsNoTracking().ToListAsync(ct);

    public async Task<IReadOnlyDictionary<Guid, string>> GetCategoryCodesAsync(CancellationToken ct) =>
        await context.IngredientCategories.AsNoTracking().ToDictionaryAsync(c => c.Id, c => c.Code, ct);

    public async Task<IReadOnlyList<IngredientCategory>> GetCategoriesAsync(CancellationToken ct) =>
        await context.IngredientCategories.AsNoTracking().OrderBy(c => c.Code).ToListAsync(ct);

    public void Add(Ingredient ingredient) => context.Ingredients.Add(ingredient);
}
