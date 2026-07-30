using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Ordering.Dtos;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Ordering.Orders;
using Coffeshop.Domain.Identity;
using MediatR;

namespace Coffeshop.Api.Endpoints.Ordering;

/// <summary>
/// Per this sprint's own Phase 4 brief. Two real, deliberate simplifications from that brief's
/// literal endpoint list, both documented here rather than silently dropped: no separate
/// <c>/orders/submit</c> — <c>CreateOrderFromCartCommand</c> creates and submits atomically in
/// one request, matching the one real checkout flow (`CheckoutExperience.tsx`'s single "Place
/// Order" action; see <c>Coffeshop.Domain.Ordering.Order</c>'s own doc comment) — and no
/// separate <c>/orders/history</c> alongside <c>/orders/me</c>, since both would return the
/// exact same data (a customer's own orders); one real route, not two paths to one result.
/// </summary>
public static class OrderEndpoints
{
    public static IEndpointRouteBuilder MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var orders = app.MapGroup("/api/v1/orders").WithTags("Orders");

        orders.MapPost("/", CreateOrder).AllowAnonymous();
        orders.MapGet("/me", GetMyOrders).RequireAuthorization();
        orders.MapGet("/{id:guid}", GetOrder).RequireAuthorization();
        orders.MapPost("/{id:guid}/cancel", CancelOrder).RequireAuthorization();
        orders.MapPost("/{id:guid}/pay", PayOrder).RequireAuthorization(PermissionCodes.UpdateOrderStatus);
        orders.MapPost("/{id:guid}/complete", CompleteOrder).RequireAuthorization(PermissionCodes.UpdateOrderStatus);
        orders.MapPost("/{id:guid}/fail", FailOrder).RequireAuthorization(PermissionCodes.UpdateOrderStatus);

        var adminOrders = app.MapGroup("/api/v1/admin/orders").WithTags("Orders").RequireAuthorization(PermissionCodes.ViewOrders);
        adminOrders.MapGet("/", GetOrders);
        adminOrders.MapGet("/{id:guid}", GetOrder);

        return app;
    }

    private static async Task<IResult> CreateOrder(CreateOrderRequest request, ISender sender, CancellationToken ct)
    {
        var lines = request.Lines.Select(line => new CartLineInput(
            line.ProductId,
            new RecipeSelectionDto(line.Selection.Color, line.Selection.Size, line.Selection.Sleeve, line.Selection.Lid, line.Selection.Logo, line.Selection.Material,
                [.. line.Selection.Ingredients.Select(i => new RecipeIngredientPlacementDto(i.IngredientId, i.Quantity))]),
            line.Quantity,
            line.RecommendationId)).ToArray();

        var dto = await sender.Send(new CreateOrderFromCartCommand(lines, request.GuestName, request.GuestEmail, request.FulfillmentMethod, request.IdempotencyKey), ct);
        return Results.Created($"/api/v1/orders/{dto.Id}", dto);
    }

    private static async Task<IResult> GetOrder(Guid id, ISender sender, CancellationToken ct)
    {
        var order = await sender.Send(new GetOrderQuery(id), ct);
        return Results.Ok(order);
    }

    private static async Task<IResult> GetMyOrders(ISender sender, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var result = await sender.Send(new GetMyOrdersQuery(new PageRequest(page, pageSize)), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetOrders(
        ISender sender,
        Guid? customerId,
        string? status,
        string? search,
        string sortBy = "Newest",
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        var filter = new OrderFilter(
            customerId,
            status is null ? null : Enum.Parse<Domain.Ordering.OrderStatus>(status, true),
            search);

        var sort = Enum.TryParse<OrderSortBy>(sortBy, true, out var parsed) ? parsed : OrderSortBy.Newest;

        var result = await sender.Send(new GetOrdersQuery(filter, sort, new PageRequest(page, pageSize)), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> CancelOrder(Guid id, CancelOrderRequest request, ISender sender, CancellationToken ct)
    {
        var order = await sender.Send(new CancelOrderCommand(id, request.Reason), ct);
        return Results.Ok(order);
    }

    private static async Task<IResult> PayOrder(Guid id, ISender sender, CancellationToken ct)
    {
        var order = await sender.Send(new PayOrderCommand(id), ct);
        return Results.Ok(order);
    }

    private static async Task<IResult> CompleteOrder(Guid id, ISender sender, CancellationToken ct)
    {
        var order = await sender.Send(new CompleteOrderCommand(id), ct);
        return Results.Ok(order);
    }

    private static async Task<IResult> FailOrder(Guid id, FailOrderRequest request, ISender sender, CancellationToken ct)
    {
        var order = await sender.Send(new FailOrderCommand(id, request.Reason), ct);
        return Results.Ok(order);
    }
}
