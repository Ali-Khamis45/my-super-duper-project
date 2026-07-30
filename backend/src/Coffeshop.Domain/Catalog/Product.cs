using Coffeshop.Domain.Catalog.Events;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Catalog.ValueObjects;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Catalog;

/// <summary>
/// Per docs/30_COMMERCE_DDD_MODEL.md's Catalog context — the menu-level catalog entry,
/// matching the frontend's existing <c>Drink</c> type field-for-field where the two overlap
/// (<c>Sku</c>→n/a, <c>Name</c>→<c>name</c>, category by id→<c>category</c> code,
/// <c>Price.Amount</c>→<c>price</c>, <c>Tagline</c>→<c>tagline</c>, <c>Description</c>→<c>description</c>,
/// <c>Tags</c>→<c>tags</c>). References <see cref="Category"/> only by id, never by
/// navigation — a separate aggregate.
///
/// Invariant: a discontinued (<see cref="ProductStatus.Archived"/>) product's price/name/etc.
/// never change again — an already-placed order's <c>RecipeSnapshotDto</c> denormalizes this
/// data at order time specifically so a later archive/price-change never retroactively rewrites
/// history (docs/30_COMMERCE_DDD_MODEL.md), but the *product row itself* staying frozen once
/// archived is this sprint's own additional, real guard against an accidental edit no one meant
/// to make to a discontinued item.
/// </summary>
public sealed class Product : AuditableEntity<Guid>
{
    private readonly List<string> _tags = [];
    private readonly List<ProductVariant> _variants = [];
    private readonly List<ProductImage> _images = [];

    public Sku Sku { get; private set; } = null!;

    public string Name { get; private set; } = null!;

    public Guid CategoryId { get; private set; }

    public Price Price { get; private set; } = null!;

    public string Tagline { get; private set; } = null!;

    public string Description { get; private set; } = null!;

    public IReadOnlyCollection<string> Tags => _tags.AsReadOnly();

    public ProductStatus Status { get; private set; }

    public bool IsAvailable { get; private set; }

    /// <summary>A real, admin-controlled flag backing the `/featured` endpoint (Sprint 5.2 Phase 4) — not a derived heuristic (e.g. "highest price"), since a merchandising decision like "which drinks to feature" is a real business choice, not something to infer from unrelated data.</summary>
    public bool IsFeatured { get; private set; }

    public Season Season { get; private set; }

    public Temperature Temperature { get; private set; }

    public ProductType Type { get; private set; }

    public NutritionFacts? Nutrition { get; private set; }

    public IReadOnlyCollection<ProductVariant> Variants => _variants.AsReadOnly();

    public IReadOnlyCollection<ProductImage> Images => _images.AsReadOnly();

    private Product()
    {
    }

    public static Product Create(
        Sku sku,
        string name,
        Guid categoryId,
        Price price,
        string tagline,
        string description,
        IReadOnlyCollection<string> tags,
        Season season,
        Temperature temperature,
        ProductType type)
    {
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Sku = sku,
            Name = name.Trim(),
            CategoryId = categoryId,
            Price = price,
            Tagline = tagline.Trim(),
            Description = description.Trim(),
            Status = ProductStatus.Draft,
            IsAvailable = true,
            Season = season,
            Temperature = temperature,
            Type = type,
        };

        product._tags.AddRange(tags.Select(t => t.Trim().ToLowerInvariant()).Distinct());
        product.AddDomainEvent(new ProductCreatedEvent(product.Id, product.Sku.Value, product.Name));
        return product;
    }

    private void EnsureNotArchived()
    {
        if (Status == ProductStatus.Archived)
        {
            throw new ProductArchivedException();
        }
    }

    public void UpdateDetails(string name, string tagline, string description, IReadOnlyCollection<string> tags)
    {
        EnsureNotArchived();
        Name = name.Trim();
        Tagline = tagline.Trim();
        Description = description.Trim();
        _tags.Clear();
        _tags.AddRange(tags.Select(t => t.Trim().ToLowerInvariant()).Distinct());
        AddDomainEvent(new ProductUpdatedEvent(Id));
    }

    public void UpdatePricing(Price price)
    {
        EnsureNotArchived();
        var oldAmount = Price.Amount.Amount;
        Price = price;

        if (oldAmount != price.Amount.Amount)
        {
            AddDomainEvent(new ProductPriceChangedEvent(Id, oldAmount, price.Amount.Amount));
        }
    }

    public void AssignCategory(Guid categoryId)
    {
        EnsureNotArchived();
        CategoryId = categoryId;
        AddDomainEvent(new ProductUpdatedEvent(Id));
    }

    public void UpdateAvailability(bool isAvailable)
    {
        IsAvailable = isAvailable;
        AddDomainEvent(new ProductUpdatedEvent(Id));
    }

    public void SetFeatured(bool isFeatured)
    {
        IsFeatured = isFeatured;
        AddDomainEvent(new ProductUpdatedEvent(Id));
    }

    public void UpdateSeasonality(Season season, Temperature temperature)
    {
        EnsureNotArchived();
        Season = season;
        Temperature = temperature;
        AddDomainEvent(new ProductUpdatedEvent(Id));
    }

    public void UpdateNutrition(NutritionFacts? nutrition)
    {
        EnsureNotArchived();
        Nutrition = nutrition;
        AddDomainEvent(new ProductUpdatedEvent(Id));
    }

    public void Publish()
    {
        if (Status != ProductStatus.Draft)
        {
            throw new InvalidProductStatusTransitionException("Only a draft product can be published.");
        }

        Status = ProductStatus.Published;
        AddDomainEvent(new ProductPublishedEvent(Id));
    }

    public void Archive()
    {
        Status = ProductStatus.Archived;
        IsAvailable = false;
        AddDomainEvent(new ProductArchivedEvent(Id));
    }

    public void Restore()
    {
        if (Status != ProductStatus.Archived)
        {
            return;
        }

        Status = ProductStatus.Draft;
        AddDomainEvent(new ProductRestoredEvent(Id));
    }

    /// <summary>
    /// The Draft-only guard `DeleteProductCommandHandler` previously enforced itself — moved
    /// into the aggregate (Sprint 5.2, Phase 8) alongside every other status-transition rule
    /// this class already owns, and the real point of adding this method at all: nothing could
    /// raise <see cref="ProductDeletedEvent"/> before, since <c>AddDomainEvent</c> is
    /// <c>protected</c> and the handler was calling <c>Remove()</c> directly on the repository.
    /// </summary>
    public void PrepareForDeletion()
    {
        if (Status != ProductStatus.Draft)
        {
            throw new InvalidProductStatusTransitionException("Only a draft product can be permanently deleted — archive a published or already-archived product instead.");
        }

        AddDomainEvent(new ProductDeletedEvent(Id, Sku.Value, Name));
    }

    public ProductVariant AddVariant(string name, Money priceAdjustment, int sortOrder)
    {
        EnsureNotArchived();
        var variant = ProductVariant.Create(name, priceAdjustment, sortOrder);
        _variants.Add(variant);
        AddDomainEvent(new ProductUpdatedEvent(Id));
        return variant;
    }

    public void RemoveVariant(Guid variantId)
    {
        EnsureNotArchived();
        _variants.RemoveAll(v => v.Id == variantId);
        AddDomainEvent(new ProductUpdatedEvent(Id));
    }

    public ProductImage AddImage(string url, string? altText, bool isPrimary, int sortOrder)
    {
        EnsureNotArchived();

        if (isPrimary)
        {
            foreach (var existing in _images)
            {
                existing.SetPrimary(false);
            }
        }

        var image = ProductImage.Create(url, altText, isPrimary, sortOrder);
        _images.Add(image);
        AddDomainEvent(new ProductUpdatedEvent(Id));
        return image;
    }

    public void RemoveImage(Guid imageId)
    {
        EnsureNotArchived();
        _images.RemoveAll(i => i.Id == imageId);
        AddDomainEvent(new ProductUpdatedEvent(Id));
    }
}
