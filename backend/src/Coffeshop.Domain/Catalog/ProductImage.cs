using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Catalog;

/// <summary>
/// An entity inside <see cref="Product"/> — <see cref="Url"/> points at a
/// Cloudinary-hosted asset via <c>IBlobStorageProvider</c> (docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md),
/// never a local file path. No product has a real uploaded image yet (the current catalog is
/// entirely procedural/3D-rendered on the frontend, per docs/milestone-5-commerce-rfc.md's
/// "what's mocked today" table) — the entity and its `/images` endpoint (Phase 4) are real and
/// exercised by the admin upload flow (Phase 7), but zero rows are seeded, since inventing
/// placeholder image URLs would be fabricated content, not real data.
/// </summary>
public sealed class ProductImage : Entity<Guid>
{
    public string Url { get; private set; } = null!;

    public string? AltText { get; private set; }

    public bool IsPrimary { get; private set; }

    public int SortOrder { get; private set; }

    private ProductImage()
    {
    }

    internal static ProductImage Create(string url, string? altText, bool isPrimary, int sortOrder) =>
        new()
        {
            Id = Guid.NewGuid(),
            Url = url,
            AltText = altText,
            IsPrimary = isPrimary,
            SortOrder = sortOrder,
        };

    internal void SetPrimary(bool isPrimary) => IsPrimary = isPrimary;
}
