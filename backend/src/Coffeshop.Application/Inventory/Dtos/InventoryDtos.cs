namespace Coffeshop.Application.Inventory.Dtos;

/// <summary>The full item — everything <c>GetInventoryItemQuery</c> returns. Ingredient code/name are resolved at query time (a live join against the Catalog schema), never denormalized onto <c>InventoryItem</c> itself — see <c>InventoryMappingExtensions</c>'s own doc comment for why.</summary>
public sealed record InventoryItemDto(
    Guid Id,
    Guid IngredientId,
    string IngredientCode,
    string IngredientName,
    int StockLevel,
    int ReservedQuantity,
    int AvailableQuantity,
    int LowStockThreshold,
    string Status,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? ModifiedAtUtc);

/// <summary>The lean list shape for <c>GetInventoryQuery</c>/dashboard/low-stock/out-of-stock views — no transaction history, matching <c>OrderSummaryDto</c>'s own "list view never needs the full aggregate" precedent.</summary>
public sealed record InventoryItemSummaryDto(
    Guid Id,
    Guid IngredientId,
    string IngredientCode,
    string IngredientName,
    int StockLevel,
    int AvailableQuantity,
    int LowStockThreshold,
    string Status);

public sealed record InventoryReservationDto(
    Guid Id,
    Guid InventoryItemId,
    Guid IngredientId,
    string IngredientCode,
    string IngredientName,
    Guid OrderId,
    /// <summary>The real, human-readable order number (<c>"CS-000042"</c>) staff actually work with — resolved from Ordering via <c>IOrderRepository.GetOrderNumbersByIdsAsync</c>, additive Sprint 5.4. <c>Order</c> has no hard-delete path, so this is never actually <c>null</c> for a real reservation; nullable only because the lookup is a dictionary miss check, not a guaranteed join.</summary>
    string? OrderNumber,
    int Quantity,
    string Status,
    DateTimeOffset ExpiresAtUtc,
    DateTimeOffset? ClosedAtUtc,
    DateTimeOffset CreatedAtUtc);

public sealed record InventoryTransactionDto(
    Guid Id,
    Guid InventoryItemId,
    Guid IngredientId,
    string IngredientCode,
    string IngredientName,
    string Reason,
    int QuantityDelta,
    int BalanceAfter,
    Guid? OrderId,
    string? Note,
    DateTimeOffset OccurredAtUtc);

/// <summary>Backs the admin Inventory dashboard (Phase 6) — real counts from a single grouped query (<c>IInventoryItemRepository.GetStatusCountsAsync</c>), plus a bounded preview list of the items actually needing attention (never the full low-stock/out-of-stock set — <c>LowStockReportQuery</c>/<c>OutOfStockProductsQuery</c> are the paged views for that).</summary>
public sealed record InventoryDashboardDto(
    int TotalItems,
    int AvailableCount,
    int LowStockCount,
    int OutOfStockCount,
    int ActiveReservationsCount,
    IReadOnlyCollection<InventoryItemSummaryDto> LowStockItems,
    IReadOnlyCollection<InventoryItemSummaryDto> OutOfStockItems);
