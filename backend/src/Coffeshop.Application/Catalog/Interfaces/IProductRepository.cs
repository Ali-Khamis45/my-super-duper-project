using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Common;

namespace Coffeshop.Application.Catalog.Interfaces;

/// <param name="SearchTerm">
/// Additive (Sprint 5.2, Phase 7) — the admin product list's own name/SKU search. Never routed
/// through <see cref="Coffeshop.Application.Catalog.Interfaces.ISearchService"/>: that ranked
/// full-text path only ever returns <c>Published</c>/available products (by design, per
/// <c>PostgresSearchService</c>'s own doc comment), which would silently hide Draft/Archived
/// rows from an admin search — a real, plain <c>ILIKE</c> substring match here instead, matching
/// admin tooling's usual "find anything regardless of status" expectation.
/// </param>
public sealed record ProductFilter(
    string? CategoryCode = null,
    Season? Season = null,
    Temperature? Temperature = null,
    bool? IsAvailable = null,
    ProductStatus? Status = null,
    string? SearchTerm = null);

public enum ProductSortBy
{
    Name,
    PriceAscending,
    PriceDescending,
    Newest,
}

/// <summary>Extends <see cref="IRepository{TAggregate,TId}"/> additively — per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's repository rules, never widening the generic interface itself.</summary>
public interface IProductRepository : IRepository<Product, Guid>
{
    Task<Product?> GetBySkuAsync(string sku, CancellationToken ct);

    Task<bool> ExistsBySkuAsync(string sku, CancellationToken ct);

    Task<(IReadOnlyList<Product> Items, int TotalCount)> GetPagedAsync(
        ProductFilter filter,
        ProductSortBy sortBy,
        int skip,
        int take,
        CancellationToken ct);

    /// <summary>Published, available, <c>IsFeatured</c> products — a real admin-controlled flag, not a derived heuristic.</summary>
    Task<IReadOnlyList<Product>> GetFeaturedAsync(int take, CancellationToken ct);

    /// <summary>
    /// A genuine hard delete — never called for a <c>Published</c>/<c>Archived</c> product
    /// (enforced in <c>DeleteProductCommandHandler</c>, not here); a still-<c>Draft</c> product
    /// has nothing else referencing it yet, so removing the row entirely is safe. Everything
    /// else uses <see cref="Product.Archive"/> (soft) instead.
    /// </summary>
    void Remove(Product product);
}
