using Coffeshop.Domain.Inventory;
using Coffeshop.Domain.Inventory.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Coffeshop.Persistence.Inventory;

public sealed class InventoryItemConfiguration : IEntityTypeConfiguration<InventoryItem>
{
    public void Configure(EntityTypeBuilder<InventoryItem> builder)
    {
        builder.ToTable("inventory_items");
        builder.HasKey(i => i.Id);

        builder.Property(i => i.IngredientId).HasColumnName("ingredient_id").IsRequired();
        builder.HasIndex(i => i.IngredientId).IsUnique(); // One InventoryItem per Ingredient — InventoryItem's own aggregate doc comment.

        builder.Property(i => i.StockLevel)
            .HasConversion(level => level.Value, value => StockLevel.Create(value))
            .HasColumnName("stock_level")
            .IsRequired();

        builder.Property(i => i.ReservedQuantity)
            .HasConversion(level => level.Value, value => StockLevel.Create(value))
            .HasColumnName("reserved_quantity")
            .IsRequired();

        builder.Property(i => i.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);

        builder.OwnsOne(i => i.LowStockPolicy, policy =>
        {
            policy.Property(p => p.Threshold).HasColumnName("low_stock_threshold").IsRequired();
        });

        builder.Navigation(i => i.LowStockPolicy).IsRequired();

        builder.Property(i => i.CreatedAtUtc).HasColumnName("created_at_utc");
        builder.Property(i => i.CreatedBy).HasColumnName("created_by");
        builder.Property(i => i.ModifiedAtUtc).HasColumnName("modified_at_utc");
        builder.Property(i => i.ModifiedBy).HasColumnName("modified_by");
        builder.Property(i => i.IsDeleted).HasColumnName("is_deleted");
        builder.Property(i => i.DeletedAtUtc).HasColumnName("deleted_at_utc");
        builder.HasQueryFilter(i => !i.IsDeleted);

        builder.Property(i => i.RowVersion)
            .HasColumnName("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsRowVersion();

        // Real indexes for real query patterns — GetInventoryQuery/LowStockReportQuery/
        // OutOfStockProductsQuery all filter by Status; the dashboard groups by it.
        builder.HasIndex(i => i.Status);
    }
}
