using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

public sealed record RestoreProductCommand(Guid ProductId) : ICommand<Unit>;

internal sealed class RestoreProductCommandHandler(IProductRepository productRepository)
    : IRequestHandler<RestoreProductCommand, Unit>
{
    public async Task<Unit> Handle(RestoreProductCommand request, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(request.ProductId, cancellationToken)
            ?? throw new ProductNotFoundException();

        product.Restore();

        return Unit.Value;
    }
}
