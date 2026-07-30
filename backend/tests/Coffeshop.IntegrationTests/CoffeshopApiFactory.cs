using Coffeshop.Domain.Identity;
using Coffeshop.Persistence;
using Coffeshop.Persistence.Seed;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace Coffeshop.IntegrationTests;

/// <summary>
/// A real Postgres in a Testcontainers-managed container per test run — the only test project
/// allowed to touch a real database, per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's testing
/// standards. Migrations + seed data apply once at startup, mirroring what Program.cs does in
/// Development.
/// </summary>
public sealed class CoffeshopApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("coffeshop_test")
        .WithUsername("coffeshop")
        .WithPassword("coffeshop")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Postgres"] = _postgres.GetConnectionString(),
                ["Jwt:SigningKey"] = "integration-test-signing-key-at-least-32-bytes-long",
                ["Jwt:Issuer"] = "coffeshop-api-tests",
                ["Jwt:Audience"] = "coffeshop-tests",
                ["Auth:FrontendBaseUrl"] = "http://localhost:3000",
                ["Smtp:Host"] = "127.0.0.1", // unreachable on purpose — SmtpEmailSender swallows failures, per its own design
                ["Smtp:Port"] = "1",
            });
        });
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CoffeshopDbContext>();
        await context.Database.MigrateAsync();
        await IdentitySeeder.SeedAsync(context);
        await CatalogSeeder.SeedAsync(context);
    }

    /// <summary>Test-only helper — grants the Admin role directly, mirroring the manual `psql` role-promotion used during this sprint's live verification, since no self-service "become admin" endpoint exists (correctly — that would be a real security hole).</summary>
    public async Task PromoteToAdminAsync(Guid userId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CoffeshopDbContext>();
        var adminRole = await context.Roles.FirstAsync(r => r.Name == RoleNames.Admin);
        var user = await context.Users.FirstAsync(u => u.Id == userId);
        user.AssignRole(adminRole.Id);
        await context.SaveChangesAsync();
    }

    public new async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
        await base.DisposeAsync();
    }
}
