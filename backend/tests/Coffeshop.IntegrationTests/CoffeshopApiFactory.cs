using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Identity.ValueObjects;
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

    /// <summary>Additive (Sprint 5.3) — same shape as <see cref="PromoteToAdminAsync"/>, but the Staff role (`ViewOrders`/`UpdateOrderStatus` only, not the full Admin permission set) is the realistic role for Ordering's own admin endpoints, exactly like the manual `psql` role-promotion this sprint's own live verification used.</summary>
    public async Task PromoteToStaffAsync(Guid userId)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CoffeshopDbContext>();
        var staffRole = await context.Roles.FirstAsync(r => r.Name == RoleNames.Staff);
        var user = await context.Users.FirstAsync(u => u.Id == userId);
        user.AssignRole(staffRole.Id);
        await context.SaveChangesAsync();
    }

    /// <summary>
    /// Additive (Sprint 5.3) — creates an already-verified user directly against the database,
    /// bypassing `POST /auth/register` entirely. Ordering's own test suite needs several distinct
    /// real identities (owner/non-owner/staff), and going through the real HTTP register+verify
    /// flow for each one collides with the real `AuthPolicy` rate limiter (10 requests/minute/IP,
    /// `RateLimitingExtensions.cs`) once a test class needs more than a couple — a real limiter
    /// correctly doing its job, not a bug, but exactly the kind of volume this shared helper is
    /// for. Login still goes through the real endpoint everywhere it's used, since a real JWT is
    /// what these tests actually need.
    /// </summary>
    public async Task<Guid> CreateVerifiedUserAsync(string email, string password, string fullName = "Test User")
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<CoffeshopDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var customerRole = await context.Roles.FirstAsync(r => r.Name == RoleNames.Customer);

        var user = User.Register(Email.Create(email), passwordHasher.Hash(password), FullName.Create(fullName), customerRole.Id);
        var tokenHash = $"integration-test-verification-hash-{Guid.NewGuid():N}"; // `email_verification_tokens.token_hash` is globally unique — a shared literal here collides across every user this helper creates.
        user.GenerateEmailVerificationToken(tokenHash, DateTimeOffset.UtcNow.AddHours(1));
        user.VerifyEmail(tokenHash);

        context.Users.Add(user);
        await context.SaveChangesAsync();
        return user.Id;
    }

    public new async Task DisposeAsync()
    {
        await _postgres.DisposeAsync();
        await base.DisposeAsync();
    }
}
