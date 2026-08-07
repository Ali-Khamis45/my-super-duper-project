using Coffeshop.Application.Inventory.Dtos;
using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Inventory;

namespace Coffeshop.Application.Inventory.Mapping;

/// <summary>
/// Hand-written mapping, matching <c>OrderingMappingExtensions</c>'s own "never a
/// reflection-based mapper" discipline. Every mapper here takes an already-loaded
/// <see cref="Ingredient"/> (or a <c>Guid → Ingredient</c> lookup) as a parameter rather than
/// looking it up itself — <see cref="InventoryItem"/> references <c>IngredientId</c> only, never
/// a live navigation (the same "separate aggregates reference each other by id, not navigation"
/// rule <see cref="Ingredient"/>'s own doc comment states), so resolving the display code/name is
/// always the calling query handler's job, done once per request via
/// <c>IIngredientRepository.GetAllAsync</c> — the identical <c>ingredientsByCode</c> pattern
/// <c>CreateOrderFromCartCommandHandler</c> already established, keyed by id instead of code here.
/// </summary>
public static class InventoryMappingExtensions
{
    public static InventoryItemDto ToDto(this InventoryItem item, Ingredient ingredient) =>
        new(
            item.Id,
            item.IngredientId,
            ingredient.Code,
            ingredient.Name,
            item.StockLevel.Value,
            item.ReservedQuantity.Value,
            item.AvailableQuantity,
            item.LowStockPolicy.Threshold,
            item.Status.ToApiString(),
            item.CreatedAtUtc,
            item.ModifiedAtUtc);

    public static InventoryItemSummaryDto ToSummaryDto(this InventoryItem item, Ingredient ingredient) =>
        new(
            item.Id,
            item.IngredientId,
            ingredient.Code,
            ingredient.Name,
            item.StockLevel.Value,
            item.AvailableQuantity,
            item.LowStockPolicy.Threshold,
            item.Status.ToApiString());

    public static InventoryReservationDto ToDto(this InventoryReservation reservation, Ingredient ingredient, string? orderNumber) =>
        new(
            reservation.Id,
            reservation.InventoryItemId,
            reservation.IngredientId,
            ingredient.Code,
            ingredient.Name,
            reservation.OrderId,
            orderNumber,
            reservation.Quantity,
            reservation.Status.ToString().ToLowerInvariant(), // Active/Consumed/Released/Expired — every value is a single word, no kebab-case needed.
            reservation.ExpiresAtUtc,
            reservation.ClosedAtUtc,
            reservation.CreatedAtUtc);

    public static InventoryTransactionDto ToDto(this InventoryTransaction transaction, Ingredient ingredient) =>
        new(
            transaction.Id,
            transaction.InventoryItemId,
            transaction.IngredientId,
            ingredient.Code,
            ingredient.Name,
            transaction.Reason.ToApiString(),
            transaction.QuantityDelta,
            transaction.BalanceAfter,
            transaction.OrderId,
            transaction.Note,
            transaction.OccurredAtUtc);

    /// <summary>
    /// <c>InventoryStatus</c>'s two multi-word members (<see cref="InventoryStatus.LowStock"/>,
    /// <see cref="InventoryStatus.OutOfStock"/>) would collapse to unreadable "lowstock"/
    /// "outofstock" under a plain <c>ToString().ToLowerInvariant()</c> — the convention
    /// <c>OrderingMappingExtensions</c> uses safely only because every <c>OrderStatus</c> member
    /// happens to be a single word. Real kebab-case here instead, a genuine API contract
    /// difference caught during this sprint's own live verification, not a style preference.
    /// </summary>
    private static string ToApiString(this InventoryStatus status) => status switch
    {
        InventoryStatus.LowStock => "low-stock",
        InventoryStatus.OutOfStock => "out-of-stock",
        _ => status.ToString().ToLowerInvariant(),
    };

    /// <summary>See <see cref="ToApiString(InventoryStatus)"/>'s own doc comment — <see cref="InventoryReason"/> has the identical multi-word problem.</summary>
    private static string ToApiString(this InventoryReason reason) => reason switch
    {
        InventoryReason.OrderConsumption => "order-consumption",
        InventoryReason.ManualAdjustment => "manual-adjustment",
        _ => reason.ToString().ToLowerInvariant(),
    };
}
