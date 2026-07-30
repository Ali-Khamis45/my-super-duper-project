using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

public sealed record RemoveImageCommand(Guid ProductId, Guid ImageId) : ICommand<Unit>;

internal sealed class RemoveImageCommandHandler(IProductRepository productRepository)
    : IRequestHandler<RemoveImageCommand, Unit>
{
    public async Task<Unit> Handle(RemoveImageCommand request, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(request.ProductId, cancellationToken)
            ?? throw new ProductNotFoundException();

        product.RemoveImage(request.ImageId);

        return Unit.Value;
    }
}
