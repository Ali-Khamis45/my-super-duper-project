using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Coffeshop.Persistence.Outbox;

public sealed class OutboxMessageConfiguration : IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.ToTable("outbox_messages");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.EventType).HasColumnName("event_type").HasMaxLength(256).IsRequired();
        builder.Property(m => m.Payload).HasColumnName("payload").HasColumnType("jsonb").IsRequired();
        builder.Property(m => m.OccurredAtUtc).HasColumnName("occurred_at_utc");
        builder.Property(m => m.ProcessedAtUtc).HasColumnName("processed_at_utc");
        builder.HasIndex(m => m.ProcessedAtUtc);
    }
}
