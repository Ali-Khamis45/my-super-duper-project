using Coffeshop.Api;
using Coffeshop.Api.Endpoints.Auth;
using Coffeshop.Api.Endpoints.Catalog;
using Coffeshop.Api.Endpoints.Inventory;
using Coffeshop.Api.Endpoints.Ordering;
using Coffeshop.Api.Endpoints.Payments;
using Coffeshop.Infrastructure.Logging;
using Coffeshop.Persistence;
using Coffeshop.Persistence.Seed;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.UseCoffeshopSerilog();

builder.Services.AddCoffeshopApi(builder.Configuration);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Coffeshop API", Version = "v1" });

    // Microsoft.OpenApi 2.x reworked security-scheme references (OpenApiReference is gone);
    // AddSecurityDefinition alone is enough for Swagger UI's "Authorize" button to accept a
    // bearer token for manual verification — a global per-operation AddSecurityRequirement
    // is a documentation completeness nicety, not required for the token to actually work.
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter a JWT access token.",
    });
});

const string FrontendCorsPolicy = "FrontendCorsPolicy";
var frontendOrigin = builder.Configuration["Cors:FrontendOrigin"] ?? "http://localhost:3000";

builder.Services.AddCors(options =>
{
    // Credentialed (cookie-bearing) CORS requires a named, explicit origin — never "*",
    // per docs/36_SECURITY_MODEL.md.
    options.AddPolicy(FrontendCorsPolicy, policy =>
        policy.WithOrigins(frontendOrigin)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials());
});

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("Postgres")!, name: "postgres", tags: ["ready"]);

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    // Migrations apply as an explicit pre-deploy gate everywhere else
    // (docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's migration strategy) — auto-apply is a
    // local-dev-only convenience.
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<CoffeshopDbContext>();
        await context.Database.MigrateAsync();
        await IdentitySeeder.SeedAsync(context);
        await CatalogSeeder.SeedAsync(context);
        await InventorySeeder.SeedAsync(context);
    }

    app.UseSwagger();
    app.UseSwaggerUI();

    // Dev-only webhook simulator (see DevPaymentWebhookEndpoints' own doc comment) — never
    // mapped outside Development, so it doesn't exist as an attack surface in any real
    // deployment regardless of which IPaymentGateway is configured there.
    app.MapDevPaymentWebhookEndpoints();
}

app.UseSerilogRequestLogging();
app.UseExceptionHandler();
app.UseHttpsRedirection();
app.UseCors(FrontendCorsPolicy);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false, // liveness: process is up, no dependency checks
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready"),
});

app.MapAuthEndpoints();
app.MapProductEndpoints();
app.MapCategoryEndpoints();
app.MapIngredientEndpoints();
app.MapSearchEndpoints();
app.MapOrderEndpoints();
app.MapInventoryEndpoints();
app.MapPaymentEndpoints();

app.Run();

// Exposed for Coffeshop.IntegrationTests' WebApplicationFactory<Program>.
public partial class Program;
