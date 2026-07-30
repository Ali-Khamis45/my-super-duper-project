using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Messaging;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

/// <summary>GET /api/v1/products — admin-facing (sees every status, not just Published), matches this sprint's Phase 2 "GetProducts" query.</summary>
public sealed record GetProductsQuery(ProductFilter Filter, ProductSortBy SortBy, PageRequest Page)
    : IQuery<PagedResult<ProductSummaryDto>>;

internal sealed class GetProductsQueryHandler(IProductRepository productRepository, ICategoryRepository categoryRepository)
    : IRequestHandler<GetProductsQuery, PagedResult<ProductSummaryDto>>
{
    public async Task<PagedResult<ProductSummaryDto>> Handle(GetProductsQuery request, CancellationToken cancellationToken)
    {
        var (items, totalCount) = await productRepository.GetPagedAsync(
            request.Filter, request.SortBy, request.Page.SkipCount, request.Page.ClampedPageSize, cancellationToken);

        // One extra query for the full category set (a handful of rows), not one per product —
        // the N+1 this sprint's own review checklist explicitly names as a real risk to check for.
        var categories = await categoryRepository.GetAllAsync(cancellationToken);
        var categoryCodesById = categories.ToDictionary(c => c.Id, c => c.Code);

        var dtos = items.Select(p => p.ToSummaryDto(categoryCodesById.GetValueOrDefault(p.CategoryId, ""))).ToList();

        return new PagedResult<ProductSummaryDto>(dtos, request.Page.Page, request.Page.ClampedPageSize, totalCount);
    }
}
