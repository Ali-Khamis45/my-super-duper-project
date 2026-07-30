using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Catalog.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Catalog.Products;

public sealed record UpdateAvailabilityCommand(Guid ProductId, bool IsAvailable) : ICommand<Unit>;

public sealed class UpdateAvailabilityCommandValidator : AbstractValidator<UpdateAvailabilityCommand>
{
    public UpdateAvailabilityCommandValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
    }
}

internal sealed class UpdateAvailabilityCommandHandler(IProductRepository productRepository)
    : IRequestHandler<UpdateAvailabilityCommand, Unit>
{
    public async Task<Unit> Handle(UpdateAvailabilityCommand request, CancellationToken cancellationToken)
    {
        var product = await productRepository.GetByIdAsync(request.ProductId, cancellationToken)
            ?? throw new ProductNotFoundException();

        product.UpdateAvailability(request.IsAvailable);

        return Unit.Value;
    }
}
