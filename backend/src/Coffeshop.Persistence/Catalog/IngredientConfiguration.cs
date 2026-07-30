using Coffeshop.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Coffeshop.Persistence.Catalog;

public sealed class IngredientConfiguration : IEntityTypeConfiguration<Ingredient>
{
    public void Configure(EntityTypeBuilder<Ingredient> builder)
    {
        builder.ToTable("ingredients");
        builder.HasKey(i => i.Id);
        builder.HasQueryFilter(i => !i.IsDeleted);

        builder.Property(i => i.Code).HasColumnName("code").HasMaxLength(40).IsRequired();
        builder.HasIndex(i => i.Code).IsUnique();

        builder.Property(i => i.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(i => i.IngredientCategoryId).HasColumnName("ingredient_category_id");

        builder.OwnsOne(i => i.PriceModifier, money =>
        {
            money.Property(m => m.Amount).HasColumnName("price_modifier_amount").HasColumnType("numeric(10,2)");
            money.Property(m => m.Currency).HasColumnName("price_modifier_currency").HasMaxLength(3);
        });

        builder.Property(i => i.IsUniversallyCompatible).HasColumnName("is_universally_compatible");

        builder.Ignore(i => i.CompatibleCategoryCodes);
        builder.Property<List<string>>("_compatibleCategoryCodes")
            .HasColumnName("compatible_category_codes")
            .HasColumnType("text[]")
            .IsRequired();

        builder.Property(i => i.Color).HasColumnName("color").HasMaxLength(20).IsRequired();
        builder.Property(i => i.Shape).HasColumnName("shape").HasConversion<string>().HasMaxLength(20);
        builder.Property(i => i.SortOrder).HasColumnName("sort_order");

        builder.Property(i => i.CreatedAtUtc).HasColumnName("created_at_utc");
        builder.Property(i => i.CreatedBy).HasColumnName("created_by");
        builder.Property(i => i.ModifiedAtUtc).HasColumnName("modified_at_utc");
        builder.Property(i => i.ModifiedBy).HasColumnName("modified_by");
        builder.Property(i => i.IsDeleted).HasColumnName("is_deleted");
        builder.Property(i => i.DeletedAtUtc).HasColumnName("deleted_at_utc");

        builder.Property(i => i.RowVersion)
            .HasColumnName("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsRowVersion();
    }
}
