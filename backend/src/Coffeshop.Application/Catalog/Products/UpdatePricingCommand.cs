using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Catalog.ValueObjects;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

public sealed record UpdatePricingCommand(Guid ProductId, decimal Price, decimal? CompareAtPrice) : ICommand<ProductDto>;

public sealed class UpdatePricingCommandValidator : AbstractValidator<UpdatePricingCommand>
{
    public UpdatePricingCommandValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Price).GreaterThan(0);
        RuleFor(x => x.CompareAtPrice).GreaterThan(x => x.Price).When(x => x.CompareAtPrice is not null);
    }
}

internal sealed class UpdatePricingCommandHandler(IProductRepository productRepository, ICategoryRepository categoryRepository)
    : IRequestHandler<UpdatePricingCommand, ProductDto>
{
    public async Task<ProductDto> Handle(UpdatePricingCommand request, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(request.ProductId, cancellationToken)
            ?? throw new ProductNotFoundException();

        var price = Price.Create(
            Money.Create(request.Price),
            request.CompareAtPrice.HasValue ? Money.Create(request.CompareAtPrice.Value) : null);

        product.UpdatePricing(price);

        var category = await categoryRepository.GetByIdAsync(product.CategoryId, cancellationToken);
        return product.ToDto(category?.Code ?? "");
    }
}
