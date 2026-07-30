using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Persistence.Interceptors;
using Coffeshop.Persistence.Repositories;
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
            options.UseNpgsql(configuration.GetConnectionString("Postgres"));
            options.AddInterceptors(
                provider.GetRequiredService<AuditableEntityInterceptor>(),
                provider.GetRequiredService<DomainEventsToOutboxInterceptor>());
        });

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}
