using Coffeshop.Application.Catalog.Categories;
using Coffeshop.Domain.Identity;
using MediatR;

namespace Coffeshop.Api.Endpoints.Catalog;

public static class CategoryEndpoints
{
    public static IEndpointRouteBuilder MapCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        var categories = app.MapGroup("/api/v1/categories").WithTags("Categories");

        categories.MapGet("/", GetCategories).AllowAnonymous();
        categories.MapPost("/", CreateCategory).RequireAuthorization(PermissionCodes.ManageProducts);
        categories.MapPut("/{id:guid}", UpdateCategory).RequireAuthorization(PermissionCodes.ManageProducts);

        return app;
    }

    private static async Task<IResult> GetCategories(ISender sender, CancellationToken ct)
    {
        var result = await sender.Send(new GetCategoriesQuery(), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> CreateCategory(CreateCategoryRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new CreateCategoryCommand(request.Code, request.Name, request.SortOrder), ct);
        return Results.Created($"/api/v1/categories/{dto.Id}", dto);
    }

    private static async Task<IResult> UpdateCategory(Guid id, UpdateCategoryRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new UpdateCategoryCommand(id, request.Name, request.SortOrder), ct);
        return Results.Ok(dto);
    }
}
