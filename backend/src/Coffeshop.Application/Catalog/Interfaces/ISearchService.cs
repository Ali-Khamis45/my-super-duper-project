using Coffeshop.Application.Catalog.Dtos;

namespace Coffeshop.Application.Catalog.Interfaces;

public sealed record SearchResult(IReadOnlyList<ProductSummaryDto> Items, int TotalCount);

/// <summary>
/// Per docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md's frozen search contract — engine-agnostic by
/// construction (a future Elasticsearch swap is a DI registration change, per
/// docs/29_COMMERCE_ARCHITECTURE_FREEZE.md scenario 9). This sprint's implementation is
/// PostgreSQL full-text search (`Coffeshop.Persistence.Search.PostgresSearchService`).
/// </summary>
public interface ISearchService
{
    Task<SearchResult> SearchProductsAsync(string query, int skip, int take, CancellationToken ct);

    /// <summary>Fast, cheap name-prefix matching for a live-typing search box — deliberately not routed through full-text ranking, per docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md's autocomplete row.</summary>
    Task<IReadOnlyList<string>> AutocompleteAsync(string prefix, int take, CancellationToken ct);
}
