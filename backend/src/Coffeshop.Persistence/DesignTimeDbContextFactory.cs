using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Coffeshop.Persistence;

/// <summary>
/// Used only by <c>dotnet ef migrations add</c>/<c>database update</c> at design time — per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's migration strategy, generating a migration never
/// requires a live database connection, only a configured provider. The connection string
/// here is never used to actually connect during migration generation.
/// </summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<CoffeshopDbContext>
{
    public CoffeshopDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<CoffeshopDbContext>();
        // Port 5540, not Npgsql's implicit 5432 default — docker-compose.yml maps this project's
        // own postgres service to host port 5540 (avoiding a collision with other local
        // projects' postgres containers on the default port). A real bug found during this
        // sprint's Phase 4 migration work: the missing Port meant `dotnet ef database update`
        // silently connected to a *different* project's postgres instance on 5432 and failed
        // authentication there, not against this project's own database at all.
        optionsBuilder.UseNpgsql("Host=localhost;Port=5540;Database=coffeshop;Username=coffeshop;Password=coffeshop");

        return new CoffeshopDbContext(optionsBuilder.Options);
    }
}
