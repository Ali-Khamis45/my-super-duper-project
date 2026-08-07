using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Domain.Inventory;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Repositories;

public sealed class InventoryItemRepository(CoffeshopDbContext context) : IInventoryItemRepository
{
    public Task<InventoryItem?> GetByIdAsync(Guid id, CancellationToken ct) =>
        context.InventoryItems.FirstOrDefaultAsync(i => i.Id == id, ct);

    public Task<InventoryItem?> GetByIngredientIdAsync(Guid ingredientId, CancellationToken ct) =>
        context.InventoryItems.FirstOrDefaultAsync(i => i.IngredientId == ingredientId, ct);

    public Task<bool> ExistsByIngredientIdAsync(Guid ingredientId, CancellationToken ct) =>
        context.InventoryItems.AnyAsync(i => i.IngredientId == ingredientId, ct);

    public void Add(InventoryItem item) => context.InventoryItems.Add(item);

    public async Task<(IReadOnlyList<InventoryItem> Items, int TotalCount)> GetPagedAsync(InventoryItemFilter filter, InventoryItemSortBy sortBy, int skip, int take, CancellationToken ct)
    {
        var query = await ApplyFilterAsync(context.InventoryItems.AsNoTracking(), filter, ct);

        var totalCount = await query.CountAsync(ct);

        // NameAsc sorts by the joined Ingredient's own name — done in-memory below, since it
        // needs the same Ingredient lookup GetInventoryQueryHandler already performs for display
        // and InventoryItem itself carries no name of its own to order by in SQL.
        // Ordering by the converted VO property itself (i.StockLevel), not i.StockLevel.Value —
        // a real, live-verified EF Core translation limitation (Phase 4 manual testing): member
        // access on a HasConversion-mapped property fails to translate inside OrderBy even though
        // the identical property translates fine in a Where equality check. Sorting on the VO
        // directly lets EF apply the conversion's own ToProvider function, the same fix shape as
        // OrderRepository's own HasConversion translation notes.
        query = sortBy switch
        {
            InventoryItemSortBy.StockAscending => query.OrderBy(i => i.StockLevel),
            InventoryItemSortBy.StockDescending => query.OrderByDescending(i => i.StockLevel),
            _ => query.OrderBy(i => i.CreatedAtUtc),
        };

        var items = await query.Skip(skip).Take(take).ToListAsync(ct);

        if (sortBy == InventoryItemSortBy.NameAsc)
        {
            var namesById = await context.Ingredients.AsNoTracking()
                .Where(ing => items.Select(i => i.IngredientId).Contains(ing.Id))
                .ToDictionaryAsync(ing => ing.Id, ing => ing.Name, ct);
            items = [.. items.OrderBy(i => namesById.GetValueOrDefault(i.IngredientId, string.Empty))];
        }

        return (items, totalCount);
    }

    public async Task<InventoryStatusCounts> GetStatusCountsAsync(CancellationToken ct)
    {
        var grouped = await context.InventoryItems.AsNoTracking()
            .GroupBy(i => i.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        int Count(InventoryStatus status) => grouped.FirstOrDefault(g => g.Status == status)?.Count ?? 0;

        return new InventoryStatusCounts(Count(InventoryStatus.Available), Count(InventoryStatus.LowStock), Count(InventoryStatus.OutOfStock));
    }

    /// <summary>
    /// <see cref="InventoryItemFilter.SearchTerm"/> matches the related <c>Ingredient</c>'s
    /// code/name — resolved here via a real join against the Catalog schema (both tables live in
    /// the same `CoffeshopDbContext`/database), never a second copy of ingredient text on
    /// <see cref="InventoryItem"/> itself. Async because the join needs one extra round trip to
    /// resolve matching ingredient ids before filtering — an `IQueryable`-only join would work
    /// too, but this keeps the Ingredient/Inventory schema boundary explicit rather than composing
    /// a cross-context LINQ join EF has to translate.
    /// </summary>
    private async Task<IQueryable<InventoryItem>> ApplyFilterAsync(IQueryable<InventoryItem> query, InventoryItemFilter filter, CancellationToken ct)
    {
        if (filter.Status.HasValue)
        {
            query = query.Where(i => i.Status == filter.Status.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var term = $"%{filter.SearchTerm.Trim()}%";
            var matchingIngredientIds = await context.Ingredients.AsNoTracking()
                .Where(ing => EF.Functions.ILike(ing.Name, term) || EF.Functions.ILike(ing.Code, term))
                .Select(ing => ing.Id)
                .ToListAsync(ct);

            query = query.Where(i => matchingIngredientIds.Contains(i.IngredientId));
        }

        return query;
    }
}
