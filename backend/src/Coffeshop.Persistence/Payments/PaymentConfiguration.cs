using Coffeshop.Domain.Payments;
using Coffeshop.Domain.Payments.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Coffeshop.Persistence.Payments;

public sealed class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("payments");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.OrderId).HasColumnName("order_id").IsRequired();
        builder.HasIndex(p => p.OrderId).IsUnique(); // One Payment per Order — Payment's own aggregate doc comment.

        builder.Property(p => p.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);
        builder.Property(p => p.Provider).HasColumnName("provider").HasConversion<string>().HasMaxLength(20);

        builder.Property(p => p.IdempotencyKey)
            .HasConversion(key => key.Value, value => IdempotencyKey.Create(value))
            .HasColumnName("idempotency_key")
            .HasMaxLength(IdempotencyKey.MaxLength)
            .IsRequired();
        builder.HasIndex(p => p.IdempotencyKey).IsUnique();

        builder.OwnsOne(p => p.Amount, money =>
        {
            money.Property(m => m.Amount).HasColumnName("amount").HasColumnType("numeric(10,2)").IsRequired();
            money.Property(m => m.Currency).HasColumnName("currency").HasMaxLength(3).IsRequired();
        });
        builder.Navigation(p => p.Amount).IsRequired();

        builder.OwnsOne(p => p.RefundedAmount, money =>
        {
            money.Property(m => m.Amount).HasColumnName("refunded_amount").HasColumnType("numeric(10,2)").IsRequired();
            money.Property(m => m.Currency).HasColumnName("refunded_currency").HasMaxLength(3).IsRequired();
        });
        builder.Navigation(p => p.RefundedAmount).IsRequired();

        builder.OwnsMany(p => p.Attempts, attempts =>
        {
            attempts.ToTable("payment_attempts");
            attempts.WithOwner().HasForeignKey("PaymentId");
            attempts.HasKey(a => a.Id);
            attempts.Property(a => a.Id).ValueGeneratedNever();

            attempts.Property(a => a.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20);

            attempts.Property(a => a.ProviderReference)
                .HasConversion(r => r == null ? null : r.Value, v => v == null ? null : PaymentProviderReference.Create(v))
                .HasColumnName("provider_reference")
                .HasMaxLength(255);

            attempts.OwnsOne(a => a.Method, method =>
            {
                method.Property(m => m.Type).HasColumnName("method_type").HasMaxLength(20);
                method.Property(m => m.Brand).HasColumnName("method_brand").HasMaxLength(20);
                method.Property(m => m.Last4).HasColumnName("method_last4").HasMaxLength(4);
            });

            attempts.OwnsOne(a => a.Failure, failure =>
            {
                failure.Property(f => f.Code).HasColumnName("failure_code").HasMaxLength(100);
                failure.Property(f => f.Message).HasColumnName("failure_message").HasMaxLength(500);
                failure.Property(f => f.DeclineCode).HasColumnName("failure_decline_code").HasMaxLength(100);
            });

            attempts.Property(a => a.StartedAtUtc).HasColumnName("started_at_utc").IsRequired();
            attempts.Property(a => a.ResolvedAtUtc).HasColumnName("resolved_at_utc");

            attempts.HasIndex("PaymentId");
        });

        builder.Metadata.FindNavigation(nameof(Payment.Attempts))!.SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.Property(p => p.CreatedAtUtc).HasColumnName("created_at_utc");
        builder.Property(p => p.CreatedBy).HasColumnName("created_by");
        builder.Property(p => p.ModifiedAtUtc).HasColumnName("modified_at_utc");
        builder.Property(p => p.ModifiedBy).HasColumnName("modified_by");
        builder.Property(p => p.IsDeleted).HasColumnName("is_deleted");
        builder.Property(p => p.DeletedAtUtc).HasColumnName("deleted_at_utc");
        builder.HasQueryFilter(p => !p.IsDeleted);

        builder.Property(p => p.RowVersion)
            .HasColumnName("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsRowVersion();

        // Real indexes for real query patterns — AdminPaymentSearchQuery/ListPaymentsQuery both
        // filter by Status; OrderId is already uniquely indexed above.
        builder.HasIndex(p => p.Status);
    }
}
