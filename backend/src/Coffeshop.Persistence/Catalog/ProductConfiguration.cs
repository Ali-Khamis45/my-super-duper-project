using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Catalog.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Coffeshop.Persistence.Catalog;

public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("products");
        builder.HasKey(p => p.Id);
        builder.HasQueryFilter(p => !p.IsDeleted);

        builder.Property(p => p.Sku)
            .HasConversion(sku => sku.Value, value => Sku.Create(value))
            .HasColumnName("sku")
            .HasMaxLength(32)
            .IsRequired();
        builder.HasIndex(p => p.Sku).IsUnique();

        builder.Property(p => p.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
        builder.Property(p => p.CategoryId).HasColumnName("category_id");

        builder.OwnsOne(p => p.Price, price =>
        {
            price.OwnsOne(pr => pr.Amount, money =>
            {
                money.Property(m => m.Amount).HasColumnName("price_amount").HasColumnType("numeric(10,2)").IsRequired();
                money.Property(m => m.Currency).HasColumnName("price_currency").HasMaxLength(3).IsRequired();
            });

            price.OwnsOne(pr => pr.CompareAtAmount, money =>
            {
                money.Property(m => m.Amount).HasColumnName("compare_at_amount").HasColumnType("numeric(10,2)");
                money.Property(m => m.Currency).HasColumnName("compare_at_currency").HasMaxLength(3);
            });

            price.Navigation(pr => pr.Amount).IsRequired();
        });

        builder.Property(p => p.Tagline).HasColumnName("tagline").HasMaxLength(200).IsRequired();
        builder.Property(p => p.Description).HasColumnName("description").HasMaxLength(2000).IsRequired();

        builder.Ignore(p => p.Tags);
        builder.Property<List<string>>("_tags").HasColumnName("tags").HasColumnType("text[]").IsRequired();

        builder.Property(p => p.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.IsAvailable).HasColumnName("is_available");
        builder.Property(p => p.IsFeatured).HasColumnName("is_featured");
        builder.Property(p => p.Season).HasColumnName("season").HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Temperature).HasColumnName("temperature").HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(20);

        builder.OwnsOne(p => p.Nutrition, nutrition =>
        {
            nutrition.Property(n => n.Calories).HasColumnName("nutrition_calories");
            nutrition.Property(n => n.CaffeineMg).HasColumnName("nutrition_caffeine_mg");
            nutrition.Property(n => n.SugarGrams).HasColumnName("nutrition_sugar_grams");
        });

        builder.OwnsMany(p => p.Variants, variants =>
        {
            variants.ToTable("product_variants");
            variants.WithOwner().HasForeignKey("ProductId");
            variants.HasKey(v => v.Id);
            // ValueGeneratedNever — without it, EF's default Guid-key convention misjudges a
            // freshly-added owned entity as already-existing and emits an UPDATE instead of an
            // INSERT (the real bug found and fixed during Sprint 5.1's manual verification for
            // RefreshToken; applied here from the start rather than rediscovering it).
            variants.Property(v => v.Id).ValueGeneratedNever();
            variants.Property(v => v.Name).HasColumnName("name").HasMaxLength(50).IsRequired();

            variants.OwnsOne(v => v.PriceAdjustment, money =>
            {
                money.Property(m => m.Amount).HasColumnName("price_adjustment_amount").HasColumnType("numeric(10,2)").IsRequired();
                money.Property(m => m.Currency).HasColumnName("price_adjustment_currency").HasMaxLength(3).IsRequired();
            });

            variants.Property(v => v.SortOrder).HasColumnName("sort_order");
        });

        builder.Metadata.FindNavigation(nameof(Product.Variants))!.SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.OwnsMany(p => p.Images, images =>
        {
            images.ToTable("product_images");
            images.WithOwner().HasForeignKey("ProductId");
            images.HasKey(i => i.Id);
            images.Property(i => i.Id).ValueGeneratedNever();
            images.Property(i => i.Url).HasColumnName("url").HasMaxLength(2000).IsRequired();
            images.Property(i => i.AltText).HasColumnName("alt_text").HasMaxLength(200);
            images.Property(i => i.IsPrimary).HasColumnName("is_primary");
            images.Property(i => i.SortOrder).HasColumnName("sort_order");
        });

        builder.Metadata.FindNavigation(nameof(Product.Images))!.SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.Property(p => p.CreatedAtUtc).HasColumnName("created_at_utc");
        builder.Property(p => p.CreatedBy).HasColumnName("created_by");
        builder.Property(p => p.ModifiedAtUtc).HasColumnName("modified_at_utc");
        builder.Property(p => p.ModifiedBy).HasColumnName("modified_by");
        builder.Property(p => p.IsDeleted).HasColumnName("is_deleted");
        builder.Property(p => p.DeletedAtUtc).HasColumnName("deleted_at_utc");

        builder.Property(p => p.RowVersion)
            .HasColumnName("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsRowVersion();

        // Real indexes for real query patterns (docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's
        // performance guidelines) — every filter GetProductsQuery/GetMenuQuery actually uses.
        builder.HasIndex(p => p.CategoryId);
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.IsAvailable);
        builder.HasIndex(p => p.IsFeatured);

        // Full-text search (docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md) — a real, STORED
        // generated column (computed once at write time, not recomputed on every search read),
        // combining name/tagline/description with name weighted highest ('A') so a name match
        // ranks above a description-only match. A shadow property — Domain has zero knowledge
        // of this persistence-only search-indexing concern.
        builder.Property<NpgsqlTypes.NpgsqlTsVector>("SearchVector")
            .HasColumnName("search_vector")
            .HasColumnType("tsvector")
            .HasComputedColumnSql(
                "setweight(to_tsvector('english', coalesce(name,'')), 'A') || " +
                "setweight(to_tsvector('english', coalesce(tagline,'')), 'B') || " +
                "setweight(to_tsvector('english', coalesce(description,'')), 'C')",
                stored: true);

        builder.HasIndex("SearchVector").HasMethod("GIN");

        // Trigram index for fuzzy/typo-tolerant prefix matching on the product name
        // (docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md's autocomplete row) — requires the
        // pg_trgm extension, enabled once at the model level (CoffeshopDbContext.OnModelCreating).
        builder.HasIndex(p => p.Name).HasMethod("gin").HasOperators("gin_trgm_ops");
    }
}
