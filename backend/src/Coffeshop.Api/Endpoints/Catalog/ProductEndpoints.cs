using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Products;
using Coffeshop.Application.Common.Dtos;
using Coffeshop.Domain.Identity;
using MediatR;

namespace Coffeshop.Api.Endpoints.Catalog;

/// <summary>
/// Per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md's REST conventions — every mutation requires
/// <see cref="PermissionCodes.ManageProducts"/>, never a role-name check directly (docs/33_AUTH_ARCHITECTURE.md).
/// Reads are anonymous — the storefront (`/menu`, `/search`, `/featured`) has no login wall.
/// </summary>
public static class ProductEndpoints
{
    public static IEndpointRouteBuilder MapProductEndpoints(this IEndpointRouteBuilder app)
    {
        var products = app.MapGroup("/api/v1/products").WithTags("Products");

        products.MapGet("/", GetProducts).AllowAnonymous();
        products.MapGet("/{id:guid}", GetProduct).AllowAnonymous();
        products.MapPost("/", CreateProduct).RequireAuthorization(PermissionCodes.ManageProducts);
        products.MapPut("/{id:guid}", UpdateProduct).RequireAuthorization(PermissionCodes.ManageProducts);
        products.MapPut("/{id:guid}/pricing", UpdatePricing).RequireAuthorization(PermissionCodes.ManageProducts);
        products.MapPut("/{id:guid}/category", AssignCategory).RequireAuthorization(PermissionCodes.ManageProducts);
        products.MapPut("/{id:guid}/availability", UpdateAvailability).RequireAuthorization(PermissionCodes.ManageProducts);
        products.MapPut("/{id:guid}/featured", SetFeatured).RequireAuthorization(PermissionCodes.ManageProducts);
        products.MapPost("/{id:guid}/publish", PublishProduct).RequireAuthorization(PermissionCodes.ManageProducts);
        products.MapPost("/{id:guid}/archive", ArchiveProduct).RequireAuthorization(PermissionCodes.ManageProducts);
        products.MapPost("/{id:guid}/restore", RestoreProduct).RequireAuthorization(PermissionCodes.ManageProducts);
        products.MapDelete("/{id:guid}", DeleteProduct).RequireAuthorization(PermissionCodes.ManageProducts);
        products.MapPost("/{id:guid}/images", AddImage).RequireAuthorization(PermissionCodes.ManageProducts);
        products.MapDelete("/{id:guid}/images/{imageId:guid}", RemoveImage).RequireAuthorization(PermissionCodes.ManageProducts);

        app.MapGet("/api/v1/menu", GetMenu).WithTags("Menu").AllowAnonymous();
        app.MapGet("/api/v1/featured", GetFeatured).WithTags("Products").AllowAnonymous();

        return app;
    }

    private static async Task<IResult> GetProducts(
        ISender sender,
        string? category,
        string? season,
        string? temperature,
        bool? isAvailable,
        string? status,
        string? search,
        string sortBy = "Name",
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default)
    {
        var filter = new ProductFilter(
            category,
            season is null ? null : Enum.Parse<Domain.Catalog.Season>(season, true),
            temperature is null ? null : Enum.Parse<Domain.Catalog.Temperature>(temperature, true),
            isAvailable,
            status is null ? null : Enum.Parse<Domain.Catalog.ProductStatus>(status, true),
            search);

        var sort = Enum.TryParse<ProductSortBy>(sortBy, true, out var parsed) ? parsed : ProductSortBy.Name;

        var result = await sender.Send(new GetProductsQuery(filter, sort, new PageRequest(page, pageSize)), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> GetProduct(Guid id, ISender sender, CancellationToken ct)
    {
        var product = await sender.Send(new GetProductQuery(id), ct);
        return Results.Ok(product);
    }

    private static async Task<IResult> GetMenu(ISender sender, CancellationToken ct)
    {
        var menu = await sender.Send(new GetMenuQuery(), ct);
        return Results.Ok(menu);
    }

    private static async Task<IResult> GetFeatured(ISender sender, int take = 6, CancellationToken ct = default)
    {
        var featured = await sender.Send(new GetFeaturedQuery(take), ct);
        return Results.Ok(featured);
    }

    private static async Task<IResult> CreateProduct(CreateProductRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new CreateProductCommand(
            request.Sku, request.Name, request.CategoryCode, request.Price, request.CompareAtPrice,
            request.Tagline, request.Description, request.Tags, request.Season, request.Temperature, request.Type), ct);

        return Results.Created($"/api/v1/products/{dto.Id}", dto);
    }

    private static async Task<IResult> UpdateProduct(Guid id, UpdateProductRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new UpdateProductCommand(id, request.Name, request.Tagline, request.Description, request.Tags), ct);
        return Results.Ok(dto);
    }

    private static async Task<IResult> UpdatePricing(Guid id, UpdatePricingRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new UpdatePricingCommand(id, request.Price, request.CompareAtPrice), ct);
        return Results.Ok(dto);
    }

    private static async Task<IResult> AssignCategory(Guid id, AssignCategoryRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new AssignCategoryCommand(id, request.CategoryCode), ct);
        return Results.Ok(dto);
    }

    private static async Task<IResult> UpdateAvailability(Guid id, UpdateAvailabilityRequest request, ISender sender, CancellationToken ct)
    {
        await sender.Send(new UpdateAvailabilityCommand(id, request.IsAvailable), ct);
        return Results.NoContent();
    }

    private static async Task<IResult> SetFeatured(Guid id, SetFeaturedRequest request, ISender sender, CancellationToken ct)
    {
        await sender.Send(new SetFeaturedCommand(id, request.IsFeatured), ct);
        return Results.NoContent();
    }

    private static async Task<IResult> PublishProduct(Guid id, ISender sender, CancellationToken ct)
    {
        await sender.Send(new PublishProductCommand(id), ct);
        return Results.NoContent();
    }

    private static async Task<IResult> ArchiveProduct(Guid id, ISender sender, CancellationToken ct)
    {
        await sender.Send(new ArchiveProductCommand(id), ct);
        return Results.NoContent();
    }

    private static async Task<IResult> RestoreProduct(Guid id, ISender sender, CancellationToken ct)
    {
        await sender.Send(new RestoreProductCommand(id), ct);
        return Results.NoContent();
    }

    private static async Task<IResult> DeleteProduct(Guid id, ISender sender, CancellationToken ct)
    {
        await sender.Send(new DeleteProductCommand(id), ct);
        return Results.NoContent();
    }

    private static async Task<IResult> AddImage(Guid id, AddImageRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new UploadImageCommand(id, request.Url, request.AltText, request.IsPrimary), ct);
        return Results.Created($"/api/v1/products/{id}/images/{dto.Id}", dto);
    }

    private static async Task<IResult> RemoveImage(Guid id, Guid imageId, ISender sender, CancellationToken ct)
    {
        await sender.Send(new RemoveImageCommand(id, imageId), ct);
        return Results.NoContent();
    }
}
