using Coffeshop.Application.Catalog.Ingredients;
using Coffeshop.Domain.Identity;
using MediatR;

namespace Coffeshop.Api.Endpoints.Catalog;

public static class IngredientEndpoints
{
    public static IEndpointRouteBuilder MapIngredientEndpoints(this IEndpointRouteBuilder app)
    {
        var ingredients = app.MapGroup("/api/v1/ingredients").WithTags("Ingredients");

        ingredients.MapGet("/", GetIngredients).AllowAnonymous();
        ingredients.MapGet("/{code}", GetIngredient).AllowAnonymous();
        ingredients.MapPost("/", CreateIngredient).RequireAuthorization(PermissionCodes.ManageProducts);
        ingredients.MapPut("/{code}", UpdateIngredient).RequireAuthorization(PermissionCodes.ManageProducts);

        // A separate top-level resource, not `/ingredients/categories` — avoids any ambiguity
        // with the `/ingredients/{code}` route above and mirrors `/api/v1/categories` (Product
        // categories) already being its own sibling resource, not nested under `/products`.
        app.MapGet("/api/v1/ingredient-categories", GetIngredientCategories).WithTags("Ingredients").AllowAnonymous();

        return app;
    }

    private static async Task<IResult> GetIngredients(ISender sender, CancellationToken ct)
    {
        var result = await sender.Send(new GetIngredientsQuery(), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetIngredientCategories(ISender sender, CancellationToken ct)
    {
        var result = await sender.Send(new GetIngredientCategoriesQuery(), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetIngredient(string code, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new GetIngredientQuery(code), ct);
        return Results.Ok(dto);
    }

    private static async Task<IResult> CreateIngredient(CreateIngredientRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new CreateIngredientCommand(
            request.Code, request.Name, request.IngredientCategoryId, request.PriceModifier,
            request.CompatibleCategoryCodes, request.IsUniversallyCompatible, request.Color, request.Shape, request.SortOrder), ct);

        return Results.Created($"/api/v1/ingredients/{dto.Id}", dto);
    }

    private static async Task<IResult> UpdateIngredient(string code, UpdateIngredientRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new UpdateIngredientCommand(
            code, request.Name, request.PriceModifier, request.Color, request.SortOrder,
            request.CompatibleCategoryCodes, request.IsUniversallyCompatible), ct);

        return Results.Ok(dto);
    }
}
