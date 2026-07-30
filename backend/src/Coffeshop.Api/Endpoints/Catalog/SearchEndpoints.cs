using Coffeshop.Application.Catalog.Search;
using Coffeshop.Application.Common.Dtos;
using MediatR;

namespace Coffeshop.Api.Endpoints.Catalog;

public static class SearchEndpoints
{
    public static IEndpointRouteBuilder MapSearchEndpoints(this IEndpointRouteBuilder app)
    {
        var search = app.MapGroup("/api/v1/search").WithTags("Search").AllowAnonymous();

        search.MapGet("/", SearchProducts);
        search.MapGet("/autocomplete", Autocomplete);

        return app;
    }

    private static async Task<IResult> SearchProducts(string q, ISender sender, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var result = await sender.Send(new SearchProductsQuery(q, new PageRequest(page, pageSize)), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> Autocomplete(string q, ISender sender, CancellationToken ct)
    {
        var result = await sender.Send(new AutocompleteQuery(q), ct);
        return Results.Ok(result);
    }
}
