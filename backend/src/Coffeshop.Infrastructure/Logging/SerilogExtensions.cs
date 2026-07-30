using Microsoft.AspNetCore.Builder;
using Serilog;

namespace Coffeshop.Infrastructure.Logging;

/// <summary>
/// Structured logging, per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md — every log line is
/// structured (never string-interpolated), read from configuration's <c>Serilog</c> section
/// so sinks/levels are environment-config, not hardcoded. Seq (docker-compose.yml) is the dev
/// sink; the console sink is always present so logs are visible either way.
/// </summary>
public static class SerilogExtensions
{
    public static WebApplicationBuilder UseCoffeshopSerilog(this WebApplicationBuilder builder)
    {
        builder.Host.UseSerilog((context, services, configuration) =>
            configuration
                .ReadFrom.Configuration(context.Configuration)
                .ReadFrom.Services(services)
                .Enrich.FromLogContext()
                .Enrich.WithProperty("Application", "Coffeshop.Api"));

        return builder;
    }
}
