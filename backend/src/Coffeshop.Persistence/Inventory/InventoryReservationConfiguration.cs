using Coffeshop.Domain.Inventory;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Coffeshop.Persistence.Inventory;

/// <summary>
/// Its own top-level table (own repository), not an EF owned collection of <see cref="InventoryItem"/>
/// — see <see cref="InventoryReservation"/>'s own doc comment for the unbounded-growth reasoning
/// (the same one that keeps <c>OrderTimelineEntry</c> bounded-per-order but this one independent).
/// </summary>
public sealed class InventoryReservationConfiguration : IEntityTypeConfiguration<InventoryReservation>
{
    public void Configure(EntityTypeBuilder<InventoryReservation> builder)
    {
        builder.ToTable("inventory_reservations");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.InventoryItemId).HasColumnName("inventory_item_id").IsRequired();
        builder.Property(r => r.IngredientId).HasColumnName("ingredient_id").IsRequired();
        builder.Property(r => r.OrderId).HasColumnName("order_id").IsRequired();
        builder.Property(r => r.Quantity).HasColumnName("quantity").IsRequired();
        builder.Property(r => r.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
        builder.Property(r => r.ExpiresAtUtc).HasColumnName("expires_at_utc").IsRequired();
        builder.Property(r => r.ClosedAtUtc).HasColumnName("closed_at_utc");

        builder.Property(r => r.CreatedAtUtc).HasColumnName("created_at_utc");
        builder.Property(r => r.CreatedBy).HasColumnName("created_by");
        builder.Property(r => r.ModifiedAtUtc).HasColumnName("modified_at_utc");
        builder.Property(r => r.ModifiedBy).HasColumnName("modified_by");
        builder.Property(r => r.IsDeleted).HasColumnName("is_deleted");
        builder.Property(r => r.DeletedAtUtc).HasColumnName("deleted_at_utc");
        builder.HasQueryFilter(r => !r.IsDeleted);

        builder.Property(r => r.RowVersion)
            .HasColumnName("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsRowVersion();

        // Real query patterns: the coordinator's own Release/Consume-by-order lookup, the lazy
        // expiry sweep's own item+status+expiry lookup, and the admin Reservation Viewer's filters.
        builder.HasIndex(r => r.OrderId);
        builder.HasIndex(r => new { r.InventoryItemId, r.Status, r.ExpiresAtUtc });
        builder.HasIndex(r => r.Status);
    }
}
