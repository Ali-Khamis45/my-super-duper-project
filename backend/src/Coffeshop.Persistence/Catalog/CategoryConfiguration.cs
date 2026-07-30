using Coffeshop.Domain.Catalog;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Coffeshop.Persistence.Catalog;

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("categories");
        builder.HasKey(c => c.Id);
        builder.HasQueryFilter(c => !c.IsDeleted);

        builder.Property(c => c.Code).HasColumnName("code").HasMaxLength(40).IsRequired();
        builder.HasIndex(c => c.Code).IsUnique();

        builder.Property(c => c.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(c => c.SortOrder).HasColumnName("sort_order");

        builder.Property(c => c.CreatedAtUtc).HasColumnName("created_at_utc");
        builder.Property(c => c.CreatedBy).HasColumnName("created_by");
        builder.Property(c => c.ModifiedAtUtc).HasColumnName("modified_at_utc");
        builder.Property(c => c.ModifiedBy).HasColumnName("modified_by");
        builder.Property(c => c.IsDeleted).HasColumnName("is_deleted");
        builder.Property(c => c.DeletedAtUtc).HasColumnName("deleted_at_utc");

        builder.Property(c => c.RowVersion)
            .HasColumnName("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsRowVersion();
    }
}
