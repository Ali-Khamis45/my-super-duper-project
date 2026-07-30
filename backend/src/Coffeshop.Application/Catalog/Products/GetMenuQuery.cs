using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

/// <summary>
/// GET /api/v1/menu — the customer-facing catalog: Published, no draft/archived leakage,
/// deliberately not paginated. The frontend's own `MenuExperience.tsx` loads the whole catalog
/// once and filters client-side (14 items today) — this endpoint matches that real, current
/// usage exactly rather than adding pagination no real caller needs yet; `GetProducts`
/// (admin-facing, sees every status) is the paginated one.
/// </summary>
public sealed record GetMenuQuery : IQuery<IReadOnlyList<ProductSummaryDto>>;

internal sealed class GetMenuQueryHandler(IProductRepository productRepository, ICategoryRepository categoryRepository)
    : IRequestHandler<GetMenuQuery, IReadOnlyList<ProductSummaryDto>>
{
    public async Task<IReadOnlyList<ProductSummaryDto>> Handle(GetMenuQuery request, CancellationToken cancellationToken)
    {
        var filter = new ProductFilter(Status: ProductStatus.Published, IsAvailable: true);
        var (items, _) = await productRepository.GetPagedAsync(filter, ProductSortBy.Name, 0, int.MaxValue, cancellationToken);

        var categories = await categoryRepository.GetAllAsync(cancellationToken);
        var categoryCodesById = categories.ToDictionary(c => c.Id, c => c.Code);

        return [.. items.Select(p => p.ToSummaryDto(categoryCodesById.GetValueOrDefault(p.CategoryId, "")))];
    }
}
