using System.Reflection;
using Coffeshop.Domain.Catalog;
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

    public DbSet<Category> Categories => Set<Category>();

    public DbSet<IngredientCategory> IngredientCategories => Set<IngredientCategory>();

    public DbSet<Ingredient> Ingredients => Set<Ingredient>();

    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Required by ProductConfiguration's trigram (`gin_trgm_ops`) index — per
        // docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md's fuzzy/typo-tolerant matching requirement.
        modelBuilder.HasPostgresExtension("pg_trgm");

        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        base.OnModelCreating(modelBuilder);
    }
}
