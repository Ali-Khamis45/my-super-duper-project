using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

/// <summary>GET /api/v1/products/{id}.</summary>
public sealed record GetProductQuery(Guid ProductId) : IQuery<ProductDto>;

internal sealed class GetProductQueryHandler(IProductRepository productRepository, ICategoryRepository categoryRepository)
    : IRequestHandler<GetProductQuery, ProductDto>
{
    public async Task<ProductDto> Handle(GetProductQuery request, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(request.ProductId, cancellationToken)
            ?? throw new ProductNotFoundException();

        var category = await categoryRepository.GetByIdAsync(product.CategoryId, cancellationToken);
        return product.ToDto(category?.Code ?? "");
    }
}
