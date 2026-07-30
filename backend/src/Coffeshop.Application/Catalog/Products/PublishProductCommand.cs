using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

/// <summary>Draft → Published — not in the sprint brief's literal command list, but a real, necessary addition: Phase 7's admin "Draft / Published" toggle has no other way to reach Published.</summary>
public sealed record PublishProductCommand(Guid ProductId) : ICommand<Unit>;

internal sealed class PublishProductCommandHandler(IProductRepository productRepository)
    : IRequestHandler<PublishProductCommand, Unit>
{
    public async Task<Unit> Handle(PublishProductCommand request, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(request.ProductId, cancellationToken)
            ?? throw new ProductNotFoundException();

        product.Publish();

        return Unit.Value;
    }
}
