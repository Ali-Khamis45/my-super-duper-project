using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

/// <summary>
/// Takes an already-uploaded blob URL, not a file — the actual upload (multipart request →
/// `IBlobStorageProvider.UploadAsync`, per docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md) is an
/// API-layer, HTTP-specific concern; Application stays free of that, per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's layering rules.
/// </summary>
public sealed record UploadImageCommand(Guid ProductId, string Url, string? AltText, bool IsPrimary) : ICommand<ProductImageDto>;

public sealed class UploadImageCommandValidator : AbstractValidator<UploadImageCommand>
{
    public UploadImageCommandValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Url).NotEmpty().MaximumLength(2000);
    }
}

internal sealed class UploadImageCommandHandler(IProductRepository productRepository)
    : IRequestHandler<UploadImageCommand, ProductImageDto>
{
    public async Task<ProductImageDto> Handle(UploadImageCommand request, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(request.ProductId, cancellationToken)
            ?? throw new ProductNotFoundException();

        var sortOrder = product.Images.Count;
        var image = product.AddImage(request.Url, request.AltText, request.IsPrimary, sortOrder);

        return new ProductImageDto(image.Id, image.Url, image.AltText, image.IsPrimary, image.SortOrder);
    }
}
