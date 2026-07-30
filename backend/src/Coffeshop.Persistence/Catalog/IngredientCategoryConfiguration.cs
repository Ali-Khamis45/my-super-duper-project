using Coffeshop.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Coffeshop.Persistence.Catalog;

public sealed class IngredientCategoryConfiguration : IEntityTypeConfiguration<IngredientCategory>
{
    public void Configure(EntityTypeBuilder<IngredientCategory> builder)
    {
        builder.ToTable("ingredient_categories");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Code).HasColumnName("code").HasMaxLength(40).IsRequired();
        builder.HasIndex(c => c.Code).IsUnique();

        builder.Property(c => c.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
    }
}
