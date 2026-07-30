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
        optionsBuilder.UseNpgsql("Host=localhost;Database=coffeshop;Username=coffeshop;Password=coffeshop");

        return new CoffeshopDbContext(optionsBuilder.Options);
    }
}
