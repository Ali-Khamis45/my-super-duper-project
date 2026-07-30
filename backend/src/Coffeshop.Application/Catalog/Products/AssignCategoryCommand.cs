using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

public sealed record AssignCategoryCommand(Guid ProductId, string CategoryCode) : ICommand<ProductDto>;

public sealed class AssignCategoryCommandValidator : AbstractValidator<AssignCategoryCommand>
{
    public AssignCategoryCommandValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.CategoryCode).NotEmpty();
    }
}

internal sealed class AssignCategoryCommandHandler(IProductRepository productRepository, ICategoryRepository categoryRepository)
    : IRequestHandler<AssignCategoryCommand, ProductDto>
{
    public async Task<ProductDto> Handle(AssignCategoryCommand request, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(request.ProductId, cancellationToken)
            ?? throw new ProductNotFoundException();

        var category = await categoryRepository.GetByCodeAsync(request.CategoryCode, cancellationToken)
            ?? throw new CategoryNotFoundException();

        product.AssignCategory(category.Id);

        return product.ToDto(category.Code);
    }
}
