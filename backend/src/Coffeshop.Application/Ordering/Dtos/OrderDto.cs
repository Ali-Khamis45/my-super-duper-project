namespace Coffeshop.Application.Ordering.Dtos;

/// <summary>Mirrors the frontend's <c>IngredientPlacement</c> (`stores/customizer-store.ts`) field-for-field.</summary>
public sealed record RecipeIngredientPlacementDto(string IngredientId, int Quantity);

/// <summary>Mirrors the frontend's <c>CustomizerSelection</c> (`stores/customizer-store.ts`) field-for-field — see <c>Coffeshop.Domain.Ordering.ValueObjects.RecipeSelection</c>'s own doc comment for why this stays plain strings, never backend enums.</summary>
public sealed record RecipeSelectionDto(
    string Color,
    string Size,
    string Sleeve,
    string Lid,
    string Logo,
    string Material,
    IReadOnlyCollection<RecipeIngredientPlacementDto> Ingredients);

public sealed record OrderItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string Sku,
    RecipeSelectionDto Selection,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal,
    string? RecommendationId);

public sealed record OrderTimelineEntryDto(string Status, DateTimeOffset OccurredAtUtc, string? Note);

/// <summary>The full order — everything <c>GetOrderQuery</c> returns, including line items and the timeline. Per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md's DTO-to-frontend-type tracing table, `RecipeSelectionDto`/`OrderItemDto`'s `Selection`/`UnitPrice` field names match `RecipeSnapshot`'s own `selection`/`unitPrice` exactly.</summary>
public sealed record OrderDto(
    Guid Id,
    string OrderNumber,
    string Status,
    Guid? CustomerId,
    string? GuestName,
    string? GuestEmail,
    string FulfillmentMethod,
    IReadOnlyCollection<OrderItemDto> Items,
    decimal Subtotal,
    decimal Total,
    IReadOnlyCollection<OrderTimelineEntryDto> Timeline,
    string? CancellationReason,
    string? FailureReason,
    DateTimeOffset CreatedAtUtc);

/// <summary>The lean list shape for `GetOrdersQuery`/`GetMyOrdersQuery` — no items/timeline, matching `ProductSummaryDto`'s own "no variants/images payload" precedent for the identical reason (a list view never needs the full aggregate).</summary>
public sealed record OrderSummaryDto(
    Guid Id,
    string OrderNumber,
    string Status,
    Guid? CustomerId,
    string? GuestName,
    int ItemCount,
    decimal Total,
    DateTimeOffset CreatedAtUtc);
