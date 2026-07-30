using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Messaging;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Catalog.Search;

/// <summary>GET /api/v1/search — per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md's frozen `SearchProductsQuery` shape, routed through `ISearchService` (docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md) rather than the plain repository, since ranking/relevance is a genuinely different concern from a filtered listing.</summary>
public sealed record SearchProductsQuery(string Query, PageRequest Page) : IQuery<PagedResult<ProductSummaryDto>>;

public sealed class SearchProductsQueryValidator : AbstractValidator<SearchProductsQuery>
{
    public SearchProductsQueryValidator()
    {
        RuleFor(x => x.Query).NotEmpty().MaximumLength(100);
    }
}

internal sealed class SearchProductsQueryHandler(ISearchService searchService)
    : IRequestHandler<SearchProductsQuery, PagedResult<ProductSummaryDto>>
{
    public async Task<PagedResult<ProductSummaryDto>> Handle(SearchProductsQuery request, CancellationToken cancellationToken)
    {
        var result = await searchService.SearchProductsAsync(
            request.Query, request.Page.SkipCount, request.Page.ClampedPageSize, cancellationToken);

        return new PagedResult<ProductSummaryDto>(result.Items, request.Page.Page, request.Page.ClampedPageSize, result.TotalCount);
    }
}
