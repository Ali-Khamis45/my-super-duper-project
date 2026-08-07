using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Application.Inventory.Items;
using Coffeshop.Application.Inventory.Reservations;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Inventory;
using MediatR;

namespace Coffeshop.Api.Endpoints.Inventory;

/// <summary>
/// Every route lives under <c>/api/v1/admin/inventory</c> — this sprint's own brief lists bare
/// <c>/inventory</c>/<c>/inventory/{id}</c>/<c>/inventory/reservations</c>/<c>/inventory/history</c>/
/// <c>/inventory/restock</c> routes alongside <c>/admin/inventory</c> ones, but nothing in this
/// system reads raw inventory data as a customer-facing concept the way <c>/orders/me</c> is a
/// real customer-facing counterpart to <c>/admin/orders</c> — there is no "my inventory" view.
/// One real route family, admin/staff-only throughout, not a duplicated public surface with
/// nothing real behind it.
/// </summary>
public static class InventoryEndpoints
{
    public static IEndpointRouteBuilder MapInventoryEndpoints(this IEndpointRouteBuilder app)
    {
        var inventory = app.MapGroup("/api/v1/admin/inventory").WithTags("Inventory");

        inventory.MapGet("/", GetInventory).RequireAuthorization(PermissionCodes.ViewInventory);
        inventory.MapGet("/dashboard", GetDashboard).RequireAuthorization(PermissionCodes.ViewInventory);
        inventory.MapGet("/low-stock", GetLowStockReport).RequireAuthorization(PermissionCodes.ViewInventory);
        inventory.MapGet("/out-of-stock", GetOutOfStockReport).RequireAuthorization(PermissionCodes.ViewInventory);
        inventory.MapGet("/history", GetHistory).RequireAuthorization(PermissionCodes.ViewInventory);
        inventory.MapGet("/reservations", GetReservations).RequireAuthorization(PermissionCodes.ViewInventory);
        inventory.MapGet("/{id:guid}", GetInventoryItem).RequireAuthorization(PermissionCodes.ViewInventory);

        inventory.MapPost("/", CreateInventoryItem).RequireAuthorization(PermissionCodes.AdjustInventory);
        inventory.MapPost("/{id:guid}/restock", RestockInventoryItem).RequireAuthorization(PermissionCodes.AdjustInventory);
        inventory.MapPost("/{id:guid}/adjust", AdjustInventoryItem).RequireAuthorization(PermissionCodes.AdjustInventory);
        inventory.MapPost("/{id:guid}/mark-out-of-stock", MarkOutOfStock).RequireAuthorization(PermissionCodes.AdjustInventory);
        inventory.MapPost("/{id:guid}/mark-available", MarkAvailable).RequireAuthorization(PermissionCodes.AdjustInventory);
        inventory.MapPut("/{id:guid}/low-stock-policy", UpdateLowStockPolicy).RequireAuthorization(PermissionCodes.AdjustInventory);
        inventory.MapPost("/reservations/{id:guid}/expire", ExpireReservation).RequireAuthorization(PermissionCodes.AdjustInventory);

        return app;
    }

    private static async Task<IResult> GetInventory(ISender sender, string? status, string? search, string sortBy = "NameAsc", int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var filter = new InventoryItemFilter(ParseStatus(status), search);
        var sort = Enum.TryParse<InventoryItemSortBy>(sortBy, true, out var parsed) ? parsed : InventoryItemSortBy.NameAsc;

        var result = await sender.Send(new GetInventoryQuery(filter, sort, new PageRequest(page, pageSize)), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetDashboard(ISender sender, CancellationToken ct)
    {
        var result = await sender.Send(new GetInventoryDashboardQuery(), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetLowStockReport(ISender sender, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var result = await sender.Send(new LowStockReportQuery(new PageRequest(page, pageSize)), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetOutOfStockReport(ISender sender, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var result = await sender.Send(new OutOfStockProductsQuery(new PageRequest(page, pageSize)), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetHistory(ISender sender, Guid? inventoryItemId, Guid? ingredientId, Guid? orderId, string? reason, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var filter = new InventoryTransactionFilter(inventoryItemId, ingredientId, ParseReason(reason), orderId);
        var result = await sender.Send(new InventoryHistoryQuery(filter, new PageRequest(page, pageSize)), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetReservations(ISender sender, string? status, Guid? orderId, Guid? ingredientId, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var filter = new InventoryReservationFilter(status is null ? null : Enum.Parse<InventoryReservationStatus>(status, true), orderId, ingredientId);
        var result = await sender.Send(new InventoryReservationsQuery(filter, new PageRequest(page, pageSize)), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetInventoryItem(Guid id, ISender sender, CancellationToken ct)
    {
        var item = await sender.Send(new GetInventoryItemQuery(id), ct);
        return Results.Ok(item);
    }

    private static async Task<IResult> CreateInventoryItem(CreateInventoryItemRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new CreateInventoryItemCommand(request.IngredientId, request.InitialStock, request.LowStockThreshold), ct);
        return Results.Created($"/api/v1/admin/inventory/{dto.Id}", dto);
    }

    private static async Task<IResult> RestockInventoryItem(Guid id, RestockInventoryRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new RestockInventoryCommand(id, request.Quantity, request.Note), ct);
        return Results.Ok(dto);
    }

    private static async Task<IResult> AdjustInventoryItem(Guid id, AdjustInventoryRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new AdjustInventoryCommand(id, request.Delta, request.Reason), ct);
        return Results.Ok(dto);
    }

    private static async Task<IResult> MarkOutOfStock(Guid id, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new MarkOutOfStockCommand(id), ct);
        return Results.Ok(dto);
    }

    private static async Task<IResult> MarkAvailable(Guid id, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new MarkAvailableCommand(id), ct);
        return Results.Ok(dto);
    }

    private static async Task<IResult> UpdateLowStockPolicy(Guid id, UpdateLowStockPolicyRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new UpdateLowStockPolicyCommand(id, request.Threshold), ct);
        return Results.Ok(dto);
    }

    private static async Task<IResult> ExpireReservation(Guid id, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new ExpireReservationCommand(id), ct);
        return Results.Ok(dto);
    }

    /// <summary>Accepts both this API's own kebab-case output ("low-stock") and the plain enum member name ("LowStock") — see <c>InventoryMappingExtensions.ToApiString(InventoryStatus)</c>'s own doc comment for why <see cref="InventoryStatus"/> needs this instead of a plain <c>Enum.Parse</c>.</summary>
    private static InventoryStatus? ParseStatus(string? status) => status?.Replace("-", string.Empty) switch
    {
        null => null,
        var s => Enum.Parse<InventoryStatus>(s, true),
    };

    /// <summary>See <see cref="ParseStatus"/>'s own doc comment — <see cref="InventoryReason"/> has the identical kebab-case round-trip need.</summary>
    private static InventoryReason? ParseReason(string? reason) => reason?.Replace("-", string.Empty) switch
    {
        null => null,
        var s => Enum.Parse<InventoryReason>(s, true),
    };
}
