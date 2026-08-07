using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Inventory.Coordination;
using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Persistence.Interceptors;
using Coffeshop.Persistence.Repositories;
using Coffeshop.Persistence.Search;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Coffeshop.Persistence;

public static class DependencyInjection
{
    public static IServiceCollection AddPersistence(this IServiceCollection services, IConfiguration configuration)
    {
        // Scoped, not Singleton: AuditableEntityInterceptor depends on the scoped
        // ICurrentUserService (reads the current request's HttpContext) — AddDbContext's
        // configuration callback below resolves from the DbContext's own scope, so this
        // resolves correctly once per request rather than being captured as a singleton.
        services.AddScoped<AuditableEntityInterceptor>();
        services.AddScoped<DomainEventsToOutboxInterceptor>();

        services.AddDbContext<CoffeshopDbContext>((provider, options) =>
        {
            options.UseNpgsql(configuration.GetConnectionString("Postgres"), npgsql =>
            {
                // Explicit, not EF Core's implicit default (Sprint 5.2, Phase 10 review) — every
                // `Product` fetch loads two owned collections (`Variants`, `Images`) in one JOIN,
                // which EF Core warns about on every single query ("no QuerySplittingBehavior
                // configured"). `SingleQuery` is the right call here, not just the default left
                // unexamined: both collections are small and bounded (a handful of variants,
                // a handful of images per product — never the unbounded child-table case the
                // warning is really guarding against), so one round trip stays cheaper than
                // `SplitQuery`'s N+1-shaped multiple-query alternative. Declaring it explicitly
                // silences the warning as an informed choice instead of an unaddressed one.
                npgsql.UseQuerySplittingBehavior(QuerySplittingBehavior.SingleQuery);
            });
            options.AddInterceptors(
                provider.GetRequiredService<AuditableEntityInterceptor>(),
                provider.GetRequiredService<DomainEventsToOutboxInterceptor>());
        });

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IProductRepository, ProductRepository>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IIngredientRepository, IngredientRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IInventoryItemRepository, InventoryItemRepository>();
        services.AddScoped<IInventoryReservationRepository, InventoryReservationRepository>();
        services.AddScoped<IInventoryTransactionRepository, InventoryTransactionRepository>();
        services.AddScoped<ISearchService, PostgresSearchService>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}
