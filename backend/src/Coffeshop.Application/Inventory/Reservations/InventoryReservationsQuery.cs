using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Inventory.Dtos;
using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Application.Inventory.Mapping;
using Coffeshop.Application.Ordering.Interfaces;
using MediatR;

namespace Coffeshop.Application.Inventory.Reservations;

/// <summary>GET /api/v1/admin/inventory/reservations — the Reservation Viewer's list (Phase 6). Admin-only (<c>PermissionCodes.ViewInventory</c>, enforced at the endpoint).</summary>
public sealed record InventoryReservationsQuery(InventoryReservationFilter Filter, PageRequest Page) : IQuery<PagedResult<InventoryReservationDto>>;

internal sealed class InventoryReservationsQueryHandler(
    IInventoryReservationRepository inventoryReservationRepository,
    IIngredientRepository ingredientRepository,
    IOrderRepository orderRepository)
    : IRequestHandler<InventoryReservationsQuery, PagedResult<InventoryReservationDto>>
{
    public async Task<PagedResult<InventoryReservationDto>> Handle(InventoryReservationsQuery request, CancellationToken ct)
    {
        var (items, totalCount) = await inventoryReservationRepository.GetPagedAsync(request.Filter, request.Page.SkipCount, request.Page.ClampedPageSize, ct);
        var ingredientsById = (await ingredientRepository.GetAllAsync(ct)).ToDictionary(i => i.Id);
        var orderNumbersById = await orderRepository.GetOrderNumbersByIdsAsync(items.Select(r => r.OrderId), ct);

        return new PagedResult<InventoryReservationDto>(
            [.. items.Select(r => r.ToDto(ingredientsById[r.IngredientId], orderNumbersById.GetValueOrDefault(r.OrderId)))],
            request.Page.Page,
            request.Page.ClampedPageSize,
            totalCount);
    }
}
