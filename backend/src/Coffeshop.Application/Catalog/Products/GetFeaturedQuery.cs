using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Application.Common.Messaging;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

/// <summary>GET /api/v1/featured.</summary>
public sealed record GetFeaturedQuery(int Take = 6) : IQuery<IReadOnlyList<ProductSummaryDto>>;

internal sealed class GetFeaturedQueryHandler(IProductRepository productRepository, ICategoryRepository categoryRepository)
    : IRequestHandler<GetFeaturedQuery, IReadOnlyList<ProductSummaryDto>>
{
    public async Task<IReadOnlyList<ProductSummaryDto>> Handle(GetFeaturedQuery request, CancellationToken cancellationToken)
    {
        var items = await productRepository.GetFeaturedAsync(Math.Clamp(request.Take, 1, 50), cancellationToken);

        var categories = await categoryRepository.GetAllAsync(cancellationToken);
        var categoryCodesById = categories.ToDictionary(c => c.Id, c => c.Code);

        return [.. items.Select(p => p.ToSummaryDto(categoryCodesById.GetValueOrDefault(p.CategoryId, "")))];
    }
}
