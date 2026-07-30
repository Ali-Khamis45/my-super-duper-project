using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Common;

namespace Coffeshop.Application.Catalog.Interfaces;

public interface IIngredientRepository : IRepository<Ingredient, Guid>
{
    Task<Ingredient?> GetByCodeAsync(string code, CancellationToken ct);

    Task<bool> ExistsByCodeAsync(string code, CancellationToken ct);

    Task<IReadOnlyList<Ingredient>> GetAllAsync(CancellationToken ct);

    Task<IReadOnlyDictionary<Guid, string>> GetCategoryCodesAsync(CancellationToken ct);

    /// <summary>
    /// Every <see cref="IngredientCategory"/>, full entities — additive alongside
    /// <see cref="GetCategoryCodesAsync"/> (never modified; other callers keep working exactly
    /// as before) rather than widening that method's return shape. Exists for
    /// <c>GetIngredientCategoriesQuery</c>: the admin "create ingredient" form needs to show a
    /// real category picker, and <see cref="IngredientCategory.Id"/> — a real, opaque Guid — was
    /// previously undiscoverable through any endpoint at all.
    /// </summary>
    Task<IReadOnlyList<IngredientCategory>> GetCategoriesAsync(CancellationToken ct);
}
