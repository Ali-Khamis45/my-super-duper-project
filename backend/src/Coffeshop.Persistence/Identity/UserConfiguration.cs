using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Identity.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Coffeshop.Persistence.Identity;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(u => u.Id);
        builder.HasQueryFilter(u => !u.IsDeleted);

        builder.Property(u => u.Email)
            .HasConversion(email => email.Value, value => Email.Create(value))
            .HasColumnName("email")
            .HasMaxLength(256)
            .IsRequired();
        builder.HasIndex(u => u.Email).IsUnique();

        builder.Property(u => u.HashedPassword)
            .HasConversion(hp => hp.Value, value => HashedPassword.FromHash(value))
            .HasColumnName("password_hash")
            .IsRequired();

        builder.Property(u => u.FullName)
            .HasConversion(fn => fn.Value, value => FullName.Create(value))
            .HasColumnName("full_name")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(u => u.IsEmailVerified).HasColumnName("is_email_verified");
        builder.Property(u => u.LastLoginAtUtc).HasColumnName("last_login_at_utc");

        builder.Property(u => u.CreatedAtUtc).HasColumnName("created_at_utc");
        builder.Property(u => u.CreatedBy).HasColumnName("created_by");
        builder.Property(u => u.ModifiedAtUtc).HasColumnName("modified_at_utc");
        builder.Property(u => u.ModifiedBy).HasColumnName("modified_by");
        builder.Property(u => u.IsDeleted).HasColumnName("is_deleted");
        builder.Property(u => u.DeletedAtUtc).HasColumnName("deleted_at_utc");

        // xmin-backed optimistic concurrency token, per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's entity rules.
        builder.Property(u => u.RowVersion)
            .HasColumnName("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsRowVersion();

        // RoleIds references a separate aggregate (RoleDefinition) by id only, never by
        // navigation — mapped straight to a native Postgres uuid[] column via the private
        // backing field, since the public IReadOnlyCollection<Guid> wrapper isn't itself mapped.
        builder.Ignore(u => u.RoleIds);
        builder.Property<List<Guid>>("_roleIds")
            .HasColumnName("role_ids")
            .HasColumnType("uuid[]")
            .IsRequired();

        ConfigureRefreshTokens(builder);
        ConfigureEmailVerificationTokens(builder);
        ConfigurePasswordResetTokens(builder);
    }

    private static void ConfigureRefreshTokens(EntityTypeBuilder<User> builder)
    {
        builder.OwnsMany(u => u.RefreshTokens, tokens =>
        {
            tokens.ToTable("refresh_tokens");
            tokens.WithOwner().HasForeignKey("UserId");
            tokens.HasKey(t => t.Id);
            // Explicit ValueGeneratedNever: without it, EF Core's default Guid-key convention
            // (ValueGeneratedOnAdd) misjudges a client-assigned Guid on a newly-added owned
            // entity as "already existing", generating an UPDATE instead of an INSERT — a real
            // bug found during this sprint's manual verification (a fresh login threw
            // DbUpdateConcurrencyException: "expected 1 row, affected 0" on the brand-new
            // refresh_tokens row). Applied to all three owned token types below for the same reason.
            tokens.Property(t => t.Id).ValueGeneratedNever();
            tokens.Property(t => t.TokenHash).HasColumnName("token_hash").IsRequired();
            tokens.HasIndex(t => t.TokenHash).IsUnique();
            tokens.Property(t => t.ExpiresAtUtc).HasColumnName("expires_at_utc");
            tokens.Property(t => t.CreatedAtUtc).HasColumnName("created_at_utc");
            tokens.Property(t => t.CreatedByIp).HasColumnName("created_by_ip");
            tokens.Property(t => t.DeviceName).HasColumnName("device_name");
            tokens.Property(t => t.UserAgent).HasColumnName("user_agent");
            tokens.Property(t => t.LastUsedAtUtc).HasColumnName("last_used_at_utc");
            tokens.Property(t => t.RevokedAtUtc).HasColumnName("revoked_at_utc");
            tokens.Property(t => t.RevokedByIp).HasColumnName("revoked_by_ip");
            tokens.Property(t => t.ReasonRevoked).HasColumnName("reason_revoked");
            tokens.Property(t => t.ReplacedByTokenId).HasColumnName("replaced_by_token_id");
        });

        builder.Metadata.FindNavigation(nameof(User.RefreshTokens))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);
    }

    private static void ConfigureEmailVerificationTokens(EntityTypeBuilder<User> builder)
    {
        builder.OwnsMany(u => u.EmailVerificationTokens, tokens =>
        {
            tokens.ToTable("email_verification_tokens");
            tokens.WithOwner().HasForeignKey("UserId");
            tokens.HasKey(t => t.Id);
            // Explicit ValueGeneratedNever: without it, EF Core's default Guid-key convention
            // (ValueGeneratedOnAdd) misjudges a client-assigned Guid on a newly-added owned
            // entity as "already existing", generating an UPDATE instead of an INSERT — a real
            // bug found during this sprint's manual verification (a fresh login threw
            // DbUpdateConcurrencyException: "expected 1 row, affected 0" on the brand-new
            // refresh_tokens row). Applied to all three owned token types below for the same reason.
            tokens.Property(t => t.Id).ValueGeneratedNever();
            tokens.Property(t => t.TokenHash).HasColumnName("token_hash").IsRequired();
            tokens.HasIndex(t => t.TokenHash).IsUnique();
            tokens.Property(t => t.ExpiresAtUtc).HasColumnName("expires_at_utc");
            tokens.Property(t => t.CreatedAtUtc).HasColumnName("created_at_utc");
            tokens.Property(t => t.ConsumedAtUtc).HasColumnName("consumed_at_utc");
        });

        builder.Metadata.FindNavigation(nameof(User.EmailVerificationTokens))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);
    }

    private static void ConfigurePasswordResetTokens(EntityTypeBuilder<User> builder)
    {
        builder.OwnsMany(u => u.PasswordResetTokens, tokens =>
        {
            tokens.ToTable("password_reset_tokens");
            tokens.WithOwner().HasForeignKey("UserId");
            tokens.HasKey(t => t.Id);
            // Explicit ValueGeneratedNever: without it, EF Core's default Guid-key convention
            // (ValueGeneratedOnAdd) misjudges a client-assigned Guid on a newly-added owned
            // entity as "already existing", generating an UPDATE instead of an INSERT — a real
            // bug found during this sprint's manual verification (a fresh login threw
            // DbUpdateConcurrencyException: "expected 1 row, affected 0" on the brand-new
            // refresh_tokens row). Applied to all three owned token types below for the same reason.
            tokens.Property(t => t.Id).ValueGeneratedNever();
            tokens.Property(t => t.TokenHash).HasColumnName("token_hash").IsRequired();
            tokens.HasIndex(t => t.TokenHash).IsUnique();
            tokens.Property(t => t.ExpiresAtUtc).HasColumnName("expires_at_utc");
            tokens.Property(t => t.CreatedAtUtc).HasColumnName("created_at_utc");
            tokens.Property(t => t.ConsumedAtUtc).HasColumnName("consumed_at_utc");
        });

        builder.Metadata.FindNavigation(nameof(User.PasswordResetTokens))!
            .SetPropertyAccessMode(PropertyAccessMode.Field);
    }
}
