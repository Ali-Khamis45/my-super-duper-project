using Coffeshop.Domain.Common;
using Coffeshop.Domain.Inventory;

namespace Coffeshop.Application.Inventory.Interfaces;

/// <summary>
/// <c>SearchTerm</c> matches against the related <c>Ingredient</c>'s code/name — <c>InventoryItem</c>
/// itself has no display text of its own, per its own doc comment (it is a stock ledger, not a
/// second copy of the catalog). The repository implementation joins to the Catalog schema's
/// <c>ingredients</c> table to apply this filter; Application stays unaware of the join.
/// </summary>
public sealed record InventoryItemFilter(InventoryStatus? Status = null, string? SearchTerm = null);

public enum InventoryItemSortBy
{
    NameAsc,
    StockAscending,
    StockDescending,
}

public sealed record InventoryStatusCounts(int Available, int LowStock, int OutOfStock)
{
    public int Total => Available + LowStock + OutOfStock;
}

/// <summary>Extends <see cref="IRepository{TAggregate,TId}"/> additively, matching every other repository in this codebase.</summary>
public interface IInventoryItemRepository : IRepository<InventoryItem, Guid>
{
    Task<InventoryItem?> GetByIngredientIdAsync(Guid ingredientId, CancellationToken ct);

    Task<bool> ExistsByIngredientIdAsync(Guid ingredientId, CancellationToken ct);

    Task<(IReadOnlyList<InventoryItem> Items, int TotalCount)> GetPagedAsync(InventoryItemFilter filter, InventoryItemSortBy sortBy, int skip, int take, CancellationToken ct);

    /// <summary>Backs <c>GetInventoryDashboardQuery</c> — a single grouped count query, not three separate <see cref="GetPagedAsync"/> calls run just to read their <c>TotalCount</c>.</summary>
    Task<InventoryStatusCounts> GetStatusCountsAsync(CancellationToken ct);
}
