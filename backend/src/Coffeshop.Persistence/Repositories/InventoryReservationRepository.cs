using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Domain.Inventory;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Repositories;

public sealed class InventoryReservationRepository(CoffeshopDbContext context) : IInventoryReservationRepository
{
    public Task<InventoryReservation?> GetByIdAsync(Guid id, CancellationToken ct) =>
        context.InventoryReservations.FirstOrDefaultAsync(r => r.Id == id, ct);

    public void Add(InventoryReservation reservation) => context.InventoryReservations.Add(reservation);

    public Task<IReadOnlyList<InventoryReservation>> GetActiveByOrderIdAsync(Guid orderId, CancellationToken ct) =>
        Materialize(context.InventoryReservations.Where(r => r.OrderId == orderId && r.Status == InventoryReservationStatus.Active), ct);

    public Task<IReadOnlyList<InventoryReservation>> GetExpiredActiveByInventoryItemIdAsync(Guid inventoryItemId, DateTimeOffset nowUtc, CancellationToken ct) =>
        Materialize(context.InventoryReservations.Where(r =>
            r.InventoryItemId == inventoryItemId && r.Status == InventoryReservationStatus.Active && r.ExpiresAtUtc <= nowUtc), ct);

    public async Task<(IReadOnlyList<InventoryReservation> Items, int TotalCount)> GetPagedAsync(InventoryReservationFilter filter, int skip, int take, CancellationToken ct)
    {
        var query = ApplyFilter(context.InventoryReservations.AsNoTracking(), filter);

        var totalCount = await query.CountAsync(ct);
        var items = await query.OrderByDescending(r => r.CreatedAtUtc).Skip(skip).Take(take).ToListAsync(ct);

        return (items, totalCount);
    }

    private static async Task<IReadOnlyList<InventoryReservation>> Materialize(IQueryable<InventoryReservation> query, CancellationToken ct) =>
        await query.ToListAsync(ct);

    private static IQueryable<InventoryReservation> ApplyFilter(IQueryable<InventoryReservation> query, InventoryReservationFilter filter)
    {
        if (filter.Status.HasValue)
        {
            query = query.Where(r => r.Status == filter.Status.Value);
        }

        if (filter.OrderId.HasValue)
        {
            query = query.Where(r => r.OrderId == filter.OrderId.Value);
        }

        if (filter.IngredientId.HasValue)
        {
            query = query.Where(r => r.IngredientId == filter.IngredientId.Value);
        }

        return query;
    }
}
