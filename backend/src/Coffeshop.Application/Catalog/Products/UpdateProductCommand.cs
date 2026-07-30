using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

public sealed record UpdateProductCommand(
    Guid ProductId,
    string Name,
    string Tagline,
    string Description,
    IReadOnlyCollection<string> Tags) : ICommand<ProductDto>;

public sealed class UpdateProductCommandValidator : AbstractValidator<UpdateProductCommand>
{
    public UpdateProductCommandValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Tagline).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(2000);
    }
}

internal sealed class UpdateProductCommandHandler(IProductRepository productRepository, ICategoryRepository categoryRepository)
    : IRequestHandler<UpdateProductCommand, ProductDto>
{
    public async Task<ProductDto> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(request.ProductId, cancellationToken)
            ?? throw new ProductNotFoundException();

        product.UpdateDetails(request.Name, request.Tagline, request.Description, request.Tags);

        var category = await categoryRepository.GetByIdAsync(product.CategoryId, cancellationToken);
        return product.ToDto(category?.Code ?? "");
    }
}
