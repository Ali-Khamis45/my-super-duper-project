using Coffeshop.Application.Catalog.Dtos;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Mapping;
using Coffeshop.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using NpgsqlTypes;

namespace Coffeshop.Persistence.Search;

/// <summary>
/// Per docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md's frozen search architecture — PostgreSQL
/// full-text search (a real, `stored` generated `tsvector` column + GIN index, configured in
/// <c>ProductConfiguration</c>), never Elasticsearch, per
/// docs/29_COMMERCE_ARCHITECTURE_FREEZE.md scenario 9's explicit "not built now" reasoning.
/// Only <c>Published</c>/available products are searchable — a draft product leaking into
/// customer-facing search results would be a real bug, not a style choice.
/// </summary>
public sealed class PostgresSearchService(CoffeshopDbContext context) : ISearchService
{
    public async Task<SearchResult> SearchProductsAsync(string query, int skip, int take, CancellationToken ct)
    {
        var tsQueryText = BuildPrefixTsQuery(query);

        if (tsQueryText.Length == 0)
        {
            return new SearchResult([], 0);
        }

        var baseQuery = context.Products
            .AsNoTracking()
            .Where(p => p.Status == ProductStatus.Published && p.IsAvailable)
            .Where(p => EF.Property<NpgsqlTsVector>(p, "SearchVector").Matches(EF.Functions.ToTsQuery("english", tsQueryText)));

        var totalCount = await baseQuery.CountAsync(ct);

        var items = await baseQuery
            .OrderByDescending(p => EF.Property<NpgsqlTsVector>(p, "SearchVector").Rank(EF.Functions.ToTsQuery("english", tsQueryText)))
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);

        var categoryCodesById = await context.Categories.AsNoTracking().ToDictionaryAsync(c => c.Id, c => c.Code, ct);
        var dtos = items.Select(p => p.ToSummaryDto(categoryCodesById.GetValueOrDefault(p.CategoryId, ""))).ToList();

        return new SearchResult(dtos, totalCount);
    }

    public async Task<IReadOnlyList<string>> AutocompleteAsync(string prefix, int take, CancellationToken ct)
    {
        var normalized = prefix.Trim();

        if (normalized.Length == 0)
        {
            return [];
        }

        // ILike against the plain `name` column (backed by the trigram GIN index configured in
        // ProductConfiguration) — deliberately not routed through the tsvector ranking path,
        // per docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md's autocomplete row (a tighter latency
        // budget and a much simpler ranking need than a real search).
        return await context.Products
            .AsNoTracking()
            .Where(p => p.Status == ProductStatus.Published && EF.Functions.ILike(p.Name, $"{normalized}%"))
            .Select(p => p.Name)
            .Distinct()
            .OrderBy(name => name)
            .Take(take)
            .ToListAsync(ct);
    }

    /// <summary>
    /// Builds a `tsquery`-syntax string ANDing a prefix-match (`:*`) for every real word in the
    /// input, e.g. <c>"iced lat"</c> → <c>"iced:* &amp; lat:*"</c> — real prefix matching per
    /// this sprint's Phase 5, not just whole-word matching. Each term is stripped to
    /// alphanumerics before being embedded, since `tsquery`'s own syntax gives special meaning
    /// to <c>&amp; | ! ( ) :</c> — an unsanitized user query containing any of those would
    /// otherwise be a real `tsquery` syntax error (a 500), not a search that returns zero
    /// results.
    /// </summary>
    private static string BuildPrefixTsQuery(string query)
    {
        var terms = query
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(term => new string([.. term.Where(char.IsLetterOrDigit)]))
            .Where(term => term.Length > 0);

        return string.Join(" & ", terms.Select(term => $"{term}:*"));
    }
}
