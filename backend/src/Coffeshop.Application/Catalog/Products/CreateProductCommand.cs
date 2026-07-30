using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Catalog.ValueObjects;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

public sealed record CreateProductCommand(
    string Sku,
    string Name,
    string CategoryCode,
    decimal Price,
    decimal? CompareAtPrice,
    string Tagline,
    string Description,
    IReadOnlyCollection<string> Tags,
    string Season,
    string Temperature,
    string Type) : ICommand<ProductDto>;

public sealed class CreateProductCommandValidator : AbstractValidator<CreateProductCommand>
{
    public CreateProductCommandValidator()
    {
        RuleFor(x => x.Sku).NotEmpty().MaximumLength(32);
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.CategoryCode).NotEmpty();
        RuleFor(x => x.Price).GreaterThan(0);
        RuleFor(x => x.CompareAtPrice).GreaterThan(x => x.Price).When(x => x.CompareAtPrice is not null);
        RuleFor(x => x.Tagline).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.Season).Must(s => Enum.TryParse<Domain.Catalog.Season>(s, true, out _)).WithMessage("Invalid season.");
        RuleFor(x => x.Temperature).Must(t => Enum.TryParse<Domain.Catalog.Temperature>(t, true, out _)).WithMessage("Invalid temperature.");
        RuleFor(x => x.Type).Must(t => Enum.TryParse<ProductType>(t, true, out _)).WithMessage("Invalid product type.");
    }
}

internal sealed class CreateProductCommandHandler(IProductRepository productRepository, ICategoryRepository categoryRepository)
    : IRequestHandler<CreateProductCommand, ProductDto>
{
    public async Task<ProductDto> Handle(CreateProductCommand request, CancellationToken cancellationToken)
    {
        var sku = Sku.Create(request.Sku);

        if (await productRepository.ExistsBySkuAsync(sku.Value, cancellationToken))
        {
            throw new SkuAlreadyExistsException();
        }

        var category = await categoryRepository.GetByCodeAsync(request.CategoryCode, cancellationToken)
            ?? throw new CategoryNotFoundException();

        var price = Price.Create(
            Money.Create(request.Price),
            request.CompareAtPrice.HasValue ? Money.Create(request.CompareAtPrice.Value) : null);

        var product = Product.Create(
            sku,
            request.Name,
            category.Id,
            price,
            request.Tagline,
            request.Description,
            request.Tags,
            Enum.Parse<Domain.Catalog.Season>(request.Season, true),
            Enum.Parse<Domain.Catalog.Temperature>(request.Temperature, true),
            Enum.Parse<ProductType>(request.Type, true));

        productRepository.Add(product);

        return product.ToDto(category.Code);
    }
}
