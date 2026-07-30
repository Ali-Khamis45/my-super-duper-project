using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

public sealed record ArchiveProductCommand(Guid ProductId) : ICommand<Unit>;

internal sealed class ArchiveProductCommandHandler(IProductRepository productRepository)
    : IRequestHandler<ArchiveProductCommand, Unit>
{
    public async Task<Unit> Handle(ArchiveProductCommand request, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(request.ProductId, cancellationToken)
            ?? throw new ProductNotFoundException();

        product.Archive();

        return Unit.Value;
    }
}
