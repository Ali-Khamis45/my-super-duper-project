using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Catalog.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Repositories;

/// <summary>
/// SKU comparisons use the whole value-converted <see cref="Sku"/> instance
/// (<c>p.Sku == Sku.Create(x)</c>), never <c>p.Sku.Value == x</c> — the same EF Core
/// value-converter translation rule Sprint 5.1 found the hard way for <c>Email</c>
/// (docs/reviews/sprint-5.1-review.md), applied correctly here from the start.
/// </summary>
public sealed class ProductRepository(CoffeshopDbContext context) : IProductRepository
{
    public Task<Product?> GetByIdAsync(Guid id, CancellationToken ct) =>
        context.Products.FirstOrDefaultAsync(p => p.Id == id, ct);

    public Task<Product?> GetBySkuAsync(string sku, CancellationToken ct) =>
        context.Products.FirstOrDefaultAsync(p => p.Sku == Sku.Create(sku), ct);

    public Task<bool> ExistsBySkuAsync(string sku, CancellationToken ct) =>
        context.Products.AnyAsync(p => p.Sku == Sku.Create(sku), ct);

    public async Task<(IReadOnlyList<Product> Items, int TotalCount)> GetPagedAsync(
        ProductFilter filter, ProductSortBy sortBy, int skip, int take, CancellationToken ct)
    {
        var query = ApplyFilter(context.Products.AsNoTracking(), filter);

        var totalCount = await query.CountAsync(ct);

        query = sortBy switch
        {
            ProductSortBy.Name => query.OrderBy(p => p.Name),
            ProductSortBy.PriceAscending => query.OrderBy(p => p.Price.Amount.Amount),
            ProductSortBy.PriceDescending => query.OrderByDescending(p => p.Price.Amount.Amount),
            ProductSortBy.Newest => query.OrderByDescending(p => p.CreatedAtUtc),
            _ => query.OrderBy(p => p.Name),
        };

        var items = await query.Skip(skip).Take(take).ToListAsync(ct);
        return (items, totalCount);
    }

    public async Task<IReadOnlyList<Product>> GetFeaturedAsync(int take, CancellationToken ct) =>
        await context.Products
            .AsNoTracking()
            .Where(p => p.IsFeatured && p.Status == ProductStatus.Published && p.IsAvailable)
            .OrderBy(p => p.Name)
            .Take(take)
            .ToListAsync(ct);

    public void Add(Product product) => context.Products.Add(product);

    public void Remove(Product product) => context.Products.Remove(product);

    private IQueryable<Product> ApplyFilter(IQueryable<Product> query, ProductFilter filter)
    {
        if (filter.Status.HasValue)
        {
            query = query.Where(p => p.Status == filter.Status.Value);
        }

        if (filter.IsAvailable.HasValue)
        {
            query = query.Where(p => p.IsAvailable == filter.IsAvailable.Value);
        }

        if (filter.Season.HasValue)
        {
            query = query.Where(p => p.Season == filter.Season.Value);
        }

        if (filter.Temperature.HasValue)
        {
            query = query.Where(p => p.Temperature == filter.Temperature.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.CategoryCode))
        {
            // A correlated EXISTS subquery, not a separate round trip — EF Core translates
            // this into a single SQL statement (verified via the generated SQL, not assumed),
            // so filtering by category code never becomes a second query per call.
            var code = filter.CategoryCode.Trim().ToLowerInvariant();
            query = query.Where(p => context.Categories.Any(c => c.Id == p.CategoryId && c.Code == code));
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            // Plain ILIKE against `Name` only, not the tsvector/GIN-indexed path
            // `PostgresSearchService` uses — a full sequential scan on a catalog this size
            // (dozens to low hundreds of rows) is genuinely fine, and building a second ranked-
            // search pipeline just for admin's status-inclusive case would be real duplication
            // for no measurable benefit. `Sku` is deliberately excluded: it's a `HasConversion`-
            // mapped value object, and `p.Sku.Value` can't be translated to SQL (see this file's
            // own header comment on that exact EF Core limitation) — only whole-value equality
            // (`p.Sku == Sku.Create(x)`) translates, which is useless for a partial-match search.
            var term = $"%{filter.SearchTerm.Trim()}%";
            query = query.Where(p => EF.Functions.ILike(p.Name, term));
        }

        return query;
    }
}
