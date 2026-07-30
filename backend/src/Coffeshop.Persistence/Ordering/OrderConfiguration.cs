using System.Text.Json;
using Coffeshop.Domain.Ordering;
using Coffeshop.Domain.Ordering.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Coffeshop.Persistence.Ordering;

public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    /// <summary>Round-trips <see cref="RecipeSelection"/> through a single `jsonb` column — per docs/30_COMMERCE_DDD_MODEL.md's own guidance ("it has no query requirements of its own beyond redisplay"), never decomposed into relational columns/a nested owned collection. Private/nested rather than `file`-scoped: a `file` type can't appear in a member signature of this non-`file` class, and `OrderConfiguration` itself has to stay a normal, reflection-discoverable type for `ApplyConfigurationsFromAssembly` to find it.</summary>
    private sealed record RecipeSelectionJson(string Color, string Size, string Sleeve, string Lid, string Logo, string Material, IReadOnlyList<RecipeIngredientPlacementJson> Ingredients);

    private sealed record RecipeIngredientPlacementJson(string IngredientId, int Quantity);

    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("orders");
        builder.HasKey(o => o.Id);

        builder.Property(o => o.OrderNumber)
            .HasConversion(number => number.Value, value => OrderNumber.Parse(value))
            .HasColumnName("order_number")
            .HasMaxLength(20)
            .IsRequired();
        builder.HasIndex(o => o.OrderNumber).IsUnique();

        builder.Property(o => o.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
        builder.Property(o => o.CustomerId).HasColumnName("customer_id");
        builder.Property(o => o.FulfillmentMethod).HasColumnName("fulfillment_method").HasConversion<string>().HasMaxLength(20);
        builder.Property(o => o.CancellationReason).HasColumnName("cancellation_reason").HasMaxLength(500);
        builder.Property(o => o.FailureReason).HasColumnName("failure_reason").HasMaxLength(500);
        builder.Property(o => o.IdempotencyKey).HasColumnName("idempotency_key").HasMaxLength(100);
        // Partial unique index — real double-submission protection (Phase 10), but nullable
        // (guest/legacy rows with no key must never collide with each other on a shared `NULL`).
        builder.HasIndex(o => o.IdempotencyKey).IsUnique().HasFilter("idempotency_key IS NOT NULL");

        builder.OwnsOne(o => o.GuestInfo, guest =>
        {
            guest.Property(g => g.Name).HasColumnName("guest_name").HasMaxLength(200);
            guest.Property(g => g.Email).HasColumnName("guest_email").HasMaxLength(256);
        });

        builder.OwnsOne(o => o.Totals, totals =>
        {
            totals.OwnsOne(t => t.Subtotal, money =>
            {
                money.Property(m => m.Amount).HasColumnName("subtotal_amount").HasColumnType("numeric(10,2)").IsRequired();
                money.Property(m => m.Currency).HasColumnName("subtotal_currency").HasMaxLength(3).IsRequired();
            });

            totals.OwnsOne(t => t.Total, money =>
            {
                money.Property(m => m.Amount).HasColumnName("total_amount").HasColumnType("numeric(10,2)").IsRequired();
                money.Property(m => m.Currency).HasColumnName("total_currency").HasMaxLength(3).IsRequired();
            });

            totals.Navigation(t => t.Subtotal).IsRequired();
            totals.Navigation(t => t.Total).IsRequired();
        });

        builder.Navigation(o => o.Totals).IsRequired();

        builder.OwnsMany(o => o.Items, items =>
        {
            items.ToTable("order_items");
            items.WithOwner().HasForeignKey("OrderId");
            items.HasKey(i => i.Id);
            items.Property(i => i.Id).ValueGeneratedNever();

            items.Property(i => i.ProductId).HasColumnName("product_id");
            items.Property(i => i.ProductName).HasColumnName("product_name").HasMaxLength(200).IsRequired();
            items.Property(i => i.Sku).HasColumnName("sku").HasMaxLength(32).IsRequired();
            items.Property(i => i.Quantity).HasColumnName("quantity");
            items.Property(i => i.RecommendationId).HasColumnName("recommendation_id").HasMaxLength(100);

            items.Property(i => i.Selection)
                .HasConversion(
                    selection => JsonSerializer.Serialize(ToJson(selection), (JsonSerializerOptions?)null),
                    json => FromJson(JsonSerializer.Deserialize<RecipeSelectionJson>(json, (JsonSerializerOptions?)null)!))
                .HasColumnName("selection")
                .HasColumnType("jsonb")
                .IsRequired();

            items.OwnsOne(i => i.UnitPrice, money =>
            {
                money.Property(m => m.Amount).HasColumnName("unit_price_amount").HasColumnType("numeric(10,2)").IsRequired();
                money.Property(m => m.Currency).HasColumnName("unit_price_currency").HasMaxLength(3).IsRequired();
            });

            items.Navigation(i => i.UnitPrice).IsRequired();
        });

        builder.Metadata.FindNavigation(nameof(Order.Items))!.SetPropertyAccessMode(Microsoft.EntityFrameworkCore.PropertyAccessMode.Field);

        builder.OwnsMany(o => o.Timeline, timeline =>
        {
            timeline.ToTable("order_timeline_entries");
            timeline.WithOwner().HasForeignKey("OrderId");
            timeline.HasKey(e => e.Id);
            timeline.Property(e => e.Id).ValueGeneratedNever();

            timeline.Property(e => e.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
            timeline.Property(e => e.OccurredAtUtc).HasColumnName("occurred_at_utc");
            timeline.Property(e => e.Note).HasColumnName("note").HasMaxLength(500);
            timeline.Property(e => e.Sequence).HasColumnName("sequence");
        });

        builder.Metadata.FindNavigation(nameof(Order.Timeline))!.SetPropertyAccessMode(Microsoft.EntityFrameworkCore.PropertyAccessMode.Field);

        builder.Property(o => o.CreatedAtUtc).HasColumnName("created_at_utc");
        builder.Property(o => o.CreatedBy).HasColumnName("created_by");
        builder.Property(o => o.ModifiedAtUtc).HasColumnName("modified_at_utc");
        builder.Property(o => o.ModifiedBy).HasColumnName("modified_by");
        builder.Property(o => o.IsDeleted).HasColumnName("is_deleted");
        builder.Property(o => o.DeletedAtUtc).HasColumnName("deleted_at_utc");
        builder.HasQueryFilter(o => !o.IsDeleted);

        builder.Property(o => o.RowVersion)
            .HasColumnName("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsRowVersion();

        // Real indexes for real query patterns — every filter GetOrdersQuery/GetMyOrdersQuery
        // actually uses, the same discipline ProductConfiguration already established.
        builder.HasIndex(o => o.CustomerId);
        builder.HasIndex(o => o.Status);
        builder.HasIndex(o => o.CreatedAtUtc);
    }

    private static RecipeSelectionJson ToJson(RecipeSelection selection) =>
        new(selection.Color, selection.Size, selection.Sleeve, selection.Lid, selection.Logo, selection.Material,
            [.. selection.Ingredients.Select(i => new RecipeIngredientPlacementJson(i.IngredientId, i.Quantity))]);

    private static RecipeSelection FromJson(RecipeSelectionJson json) =>
        RecipeSelection.Create(json.Color, json.Size, json.Sleeve, json.Lid, json.Logo, json.Material,
            json.Ingredients.Select(i => new RecipeIngredientPlacement(i.IngredientId, i.Quantity)));
}
