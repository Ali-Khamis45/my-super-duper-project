using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Domain.Inventory;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Repositories;

public sealed class InventoryTransactionRepository(CoffeshopDbContext context) : IInventoryTransactionRepository
{
    public void Add(InventoryTransaction transaction) => context.InventoryTransactions.Add(transaction);

    public async Task<(IReadOnlyList<InventoryTransaction> Items, int TotalCount)> GetPagedAsync(InventoryTransactionFilter filter, int skip, int take, CancellationToken ct)
    {
        var query = ApplyFilter(context.InventoryTransactions.AsNoTracking(), filter);

        var totalCount = await query.CountAsync(ct);
        var items = await query.OrderByDescending(t => t.OccurredAtUtc).Skip(skip).Take(take).ToListAsync(ct);

        return (items, totalCount);
    }

    private static IQueryable<InventoryTransaction> ApplyFilter(IQueryable<InventoryTransaction> query, InventoryTransactionFilter filter)
    {
        if (filter.InventoryItemId.HasValue)
        {
            query = query.Where(t => t.InventoryItemId == filter.InventoryItemId.Value);
        }

        if (filter.IngredientId.HasValue)
        {
            query = query.Where(t => t.IngredientId == filter.IngredientId.Value);
        }

        if (filter.Reason.HasValue)
        {
            query = query.Where(t => t.Reason == filter.Reason.Value);
        }

        if (filter.OrderId.HasValue)
        {
            query = query.Where(t => t.OrderId == filter.OrderId.Value);
        }

        return query;
    }
}
