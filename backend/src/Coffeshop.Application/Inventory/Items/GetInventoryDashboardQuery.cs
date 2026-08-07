using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Inventory.Dtos;
using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Application.Inventory.Mapping;
using Coffeshop.Domain.Inventory;
using MediatR;

namespace Coffeshop.Application.Inventory.Items;

/// <summary>GET /api/v1/admin/inventory/dashboard — admin-only (<c>PermissionCodes.ViewInventory</c>, enforced at the endpoint). Bounded preview lists (5 each); the full paged views are <see cref="LowStockReportQuery"/>/<see cref="OutOfStockProductsQuery"/>.</summary>
public sealed record GetInventoryDashboardQuery : IQuery<InventoryDashboardDto>;

internal sealed class GetInventoryDashboardQueryHandler(
    IInventoryItemRepository inventoryItemRepository,
    IInventoryReservationRepository inventoryReservationRepository,
    IIngredientRepository ingredientRepository) : IRequestHandler<GetInventoryDashboardQuery, InventoryDashboardDto>
{
    private const int PreviewSize = 5;

    public async Task<InventoryDashboardDto> Handle(GetInventoryDashboardQuery request, CancellationToken ct)
    {
        var counts = await inventoryItemRepository.GetStatusCountsAsync(ct);

        var (lowStockItems, _) = await inventoryItemRepository.GetPagedAsync(
            new InventoryItemFilter(Status: InventoryStatus.LowStock), InventoryItemSortBy.StockAscending, 0, PreviewSize, ct);
        var (outOfStockItems, _) = await inventoryItemRepository.GetPagedAsync(
            new InventoryItemFilter(Status: InventoryStatus.OutOfStock), InventoryItemSortBy.NameAsc, 0, PreviewSize, ct);

        var ingredientsById = (await ingredientRepository.GetAllAsync(ct)).ToDictionary(i => i.Id);
        var (_, activeReservationsCount) = await inventoryReservationRepository.GetPagedAsync(
            new InventoryReservationFilter(Status: InventoryReservationStatus.Active), 0, 1, ct);

        return new InventoryDashboardDto(
            counts.Total,
            counts.Available,
            counts.LowStock,
            counts.OutOfStock,
            activeReservationsCount,
            [.. lowStockItems.Select(item => item.ToSummaryDto(ingredientsById[item.IngredientId]))],
            [.. outOfStockItems.Select(item => item.ToSummaryDto(ingredientsById[item.IngredientId]))]);
    }
}
