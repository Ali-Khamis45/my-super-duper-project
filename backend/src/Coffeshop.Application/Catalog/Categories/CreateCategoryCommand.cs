using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Catalog.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Catalog.Categories;

public sealed record CreateCategoryCommand(string Code, string Name, int SortOrder) : ICommand<CategoryDto>;

public sealed class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator()
    {
        RuleFor(x => x.Code).NotEmpty().MaximumLength(40).Matches("^[a-z0-9-]+$")
            .WithMessage("Code must be lowercase letters, digits, and dashes only.");
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.SortOrder).GreaterThanOrEqualTo(0);
    }
}

internal sealed class CreateCategoryCommandHandler(ICategoryRepository categoryRepository)
    : IRequestHandler<CreateCategoryCommand, CategoryDto>
{
    public async Task<CategoryDto> Handle(CreateCategoryCommand request, CancellationToken cancellationToken)
    {
        var code = request.Code.Trim().ToLowerInvariant();

        if (await categoryRepository.ExistsByCodeAsync(code, cancellationToken))
        {
            throw new CategoryAlreadyExistsException(code);
        }

        var category = Category.Create(code, request.Name, request.SortOrder);
        categoryRepository.Add(category);

        return category.ToDto();
    }
}
