using System.Reflection;
using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Inventory;
using Coffeshop.Domain.Ordering;
using Coffeshop.Domain.Payments;
using Coffeshop.Persistence.Outbox;
using Coffeshop.Persistence.Payments;
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

    public DbSet<Order> Orders => Set<Order>();

    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();

    public DbSet<InventoryReservation> InventoryReservations => Set<InventoryReservation>();

    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();

    public DbSet<Payment> Payments => Set<Payment>();

    public DbSet<ProcessedWebhookEvent> ProcessedWebhookEvents => Set<ProcessedWebhookEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Required by ProductConfiguration's trigram (`gin_trgm_ops`) index — per
        // docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md's fuzzy/typo-tolerant matching requirement.
        modelBuilder.HasPostgresExtension("pg_trgm");

        // A real Postgres sequence, not an application-level counter — see
        // Coffeshop.Domain.Ordering.ValueObjects.OrderNumber's own doc comment for why.
        modelBuilder.HasSequence<long>("order_number_seq").StartsAt(1).IncrementsBy(1);

        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
        base.OnModelCreating(modelBuilder);
    }
}
