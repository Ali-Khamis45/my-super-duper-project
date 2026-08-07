using Coffeshop.Domain.Inventory;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Coffeshop.Persistence.Inventory;

/// <summary>A plain <c>Entity&lt;Guid&gt;</c>, not an <c>AggregateRoot</c> — no <c>RowVersion</c>/soft-delete columns, since <see cref="InventoryTransaction"/> is immutable and append-only (never updated, never deleted). See <c>IInventoryTransactionRepository</c>'s own doc comment.</summary>
public sealed class InventoryTransactionConfiguration : IEntityTypeConfiguration<InventoryTransaction>
{
    public void Configure(EntityTypeBuilder<InventoryTransaction> builder)
    {
        builder.ToTable("inventory_transactions");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedNever();

        builder.Property(t => t.InventoryItemId).HasColumnName("inventory_item_id").IsRequired();
        builder.Property(t => t.IngredientId).HasColumnName("ingredient_id").IsRequired();
        builder.Property(t => t.Reason).HasColumnName("reason").HasConversion<string>().HasMaxLength(20);
        builder.Property(t => t.QuantityDelta).HasColumnName("quantity_delta").IsRequired();
        builder.Property(t => t.BalanceAfter).HasColumnName("balance_after").IsRequired();
        builder.Property(t => t.OrderId).HasColumnName("order_id");
        builder.Property(t => t.Note).HasColumnName("note").HasMaxLength(500);
        builder.Property(t => t.OccurredAtUtc).HasColumnName("occurred_at_utc").IsRequired();

        // Real query patterns: InventoryHistoryQuery's own filters (per item, per ingredient,
        // per reason, per order) and its default newest-first ordering.
        builder.HasIndex(t => t.InventoryItemId);
        builder.HasIndex(t => t.OrderId);
        builder.HasIndex(t => t.OccurredAtUtc);
    }
}
