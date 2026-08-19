using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Coffeshop.Persistence.Payments;

public sealed class ProcessedWebhookEventConfiguration : IEntityTypeConfiguration<ProcessedWebhookEvent>
{
    public void Configure(EntityTypeBuilder<ProcessedWebhookEvent> builder)
    {
        builder.ToTable("processed_webhook_events");
        builder.HasKey(e => e.EventId);
        builder.Property(e => e.EventId).HasColumnName("event_id").HasMaxLength(255).ValueGeneratedNever();
        builder.Property(e => e.ProcessedAtUtc).HasColumnName("processed_at_utc").IsRequired();
    }
}
