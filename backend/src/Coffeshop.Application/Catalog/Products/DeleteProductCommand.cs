using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

/// <summary>
/// A real hard delete, deliberately restricted to <c>Draft</c> products only — a
/// <c>Published</c>/<c>Archived</c> product might already be referenced by real data once
/// Sprint 5.3's <c>Order</c>/<c>RecipeSnapshot</c> exist; a still-draft product has nothing
/// depending on it yet. <see cref="ArchiveProductCommand"/> is the only removal path for
/// anything that's ever been published.
/// </summary>
public sealed record DeleteProductCommand(Guid ProductId) : ICommand<Unit>;

internal sealed class DeleteProductCommandHandler(IProductRepository productRepository)
    : IRequestHandler<DeleteProductCommand, Unit>
{
    public async Task<Unit> Handle(DeleteProductCommand request, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(request.ProductId, cancellationToken)
            ?? throw new ProductNotFoundException();

        product.PrepareForDeletion();
        productRepository.Remove(product);

        return Unit.Value;
    }
}
