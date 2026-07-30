using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Application.Common.Messaging;
using MediatR;

namespace Coffeshop.Application.Catalog.Categories;

/// <summary>GET /api/v1/categories.</summary>
public sealed record GetCategoriesQuery : IQuery<IReadOnlyList<CategoryDto>>;

internal sealed class GetCategoriesQueryHandler(ICategoryRepository categoryRepository)
    : IRequestHandler<GetCategoriesQuery, IReadOnlyList<CategoryDto>>
{
    public async Task<IReadOnlyList<CategoryDto>> Handle(GetCategoriesQuery request, CancellationToken cancellationToken)
    {
        var categories = await categoryRepository.GetAllAsync(cancellationToken);
        return [.. categories.OrderBy(c => c.SortOrder).Select(c => c.ToDto())];
    }
}
