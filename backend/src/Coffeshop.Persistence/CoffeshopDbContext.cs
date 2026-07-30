using System.Reflection;
using Coffeshop.Domain.Identity;
using Coffeshop.Persistence.Outbox;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence;

public sealed class CoffeshopDbContext(DbContextOptions<CoffeshopDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    public DbSet<RoleDefinition> Roles => Set<RoleDefinition>();

    public DbSet<Permission> Permissions => Set<Permission>();

    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        base.OnModelCreating(modelBuilder);
    }
}
