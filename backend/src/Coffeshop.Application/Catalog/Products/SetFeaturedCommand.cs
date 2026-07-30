using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

public sealed record SetFeaturedCommand(Guid ProductId, bool IsFeatured) : ICommand<Unit>;

internal sealed class SetFeaturedCommandHandler(IProductRepository productRepository)
    : IRequestHandler<SetFeaturedCommand, Unit>
{
    public async Task<Unit> Handle(SetFeaturedCommand request, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(request.ProductId, cancellationToken)
            ?? throw new ProductNotFoundException();

        product.SetFeatured(request.IsFeatured);

        return Unit.Value;
    }
}
