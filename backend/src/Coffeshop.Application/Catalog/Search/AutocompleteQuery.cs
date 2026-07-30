using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Messaging;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Catalog.Search;

public sealed record AutocompleteQuery(string Prefix) : IQuery<IReadOnlyList<string>>;

public sealed class AutocompleteQueryValidator : AbstractValidator<AutocompleteQuery>
{
    public AutocompleteQueryValidator()
    {
        RuleFor(x => x.Prefix).NotEmpty().MaximumLength(50);
    }
}

internal sealed class AutocompleteQueryHandler(ISearchService searchService)
    : IRequestHandler<AutocompleteQuery, IReadOnlyList<string>>
{
    public Task<IReadOnlyList<string>> Handle(AutocompleteQuery request, CancellationToken cancellationToken) =>
        searchService.AutocompleteAsync(request.Prefix, 10, cancellationToken);
}
