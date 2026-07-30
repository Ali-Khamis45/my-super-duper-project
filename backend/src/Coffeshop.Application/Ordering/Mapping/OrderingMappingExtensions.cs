using Coffeshop.Application.Ordering.Dtos;
using Coffeshop.Domain.Ordering;
using Coffeshop.Domain.Ordering.ValueObjects;

namespace Coffeshop.Application.Ordering.Mapping;

/// <summary>Hand-written mapping, matching `Coffeshop.Application.Catalog.Mapping.CatalogMappingExtensions`'s own "never a reflection-based mapper" discipline.</summary>
public static class OrderingMappingExtensions
{
    public static RecipeSelectionDto ToDto(this RecipeSelection selection) =>
        new(
            selection.Color,
            selection.Size,
            selection.Sleeve,
            selection.Lid,
            selection.Logo,
            selection.Material,
            [.. selection.Ingredients.Select(i => new RecipeIngredientPlacementDto(i.IngredientId, i.Quantity))]);

    public static OrderItemDto ToDto(this OrderItem item) =>
        new(
            item.Id,
            item.ProductId,
            item.ProductName,
            item.Sku,
            item.Selection.ToDto(),
            item.UnitPrice.Amount,
            item.Quantity,
            item.LineTotal.Amount,
            item.RecommendationId);

    public static OrderTimelineEntryDto ToDto(this OrderTimelineEntry entry) =>
        new(entry.Status.ToString().ToLowerInvariant(), entry.OccurredAtUtc, entry.Note);

    public static OrderDto ToDto(this Order order) =>
        new(
            order.Id,
            order.OrderNumber.Value,
            order.Status.ToString().ToLowerInvariant(),
            order.CustomerId,
            order.GuestInfo?.Name,
            order.GuestInfo?.Email,
            order.FulfillmentMethod.ToString().ToLowerInvariant(),
            [.. order.Items.Select(i => i.ToDto())],
            order.Totals.Subtotal.Amount,
            order.Totals.Total.Amount,
            [.. order.Timeline.OrderBy(e => e.Sequence).Select(e => e.ToDto())],
            order.CancellationReason,
            order.FailureReason,
            order.CreatedAtUtc);

    public static OrderSummaryDto ToSummaryDto(this Order order) =>
        new(
            order.Id,
            order.OrderNumber.Value,
            order.Status.ToString().ToLowerInvariant(),
            order.CustomerId,
            order.GuestInfo?.Name,
            order.Items.Sum(i => i.Quantity),
            order.Totals.Total.Amount,
            order.CreatedAtUtc);
}
