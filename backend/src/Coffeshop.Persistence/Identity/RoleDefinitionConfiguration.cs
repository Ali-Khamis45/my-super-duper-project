using Coffeshop.Domain.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Coffeshop.Persistence.Identity;

public sealed class RoleDefinitionConfiguration : IEntityTypeConfiguration<RoleDefinition>
{
    public void Configure(EntityTypeBuilder<RoleDefinition> builder)
    {
        builder.ToTable("roles");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.HasIndex(r => r.Name).IsUnique();

        builder.Ignore(r => r.PermissionCodes);
        builder.Property<List<string>>("_permissionCodes")
            .HasColumnName("permission_codes")
            .HasColumnType("text[]")
            .IsRequired();
    }
}
