using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace Coffeshop.Infrastructure.Observability;

/// <summary>
/// OpenTelemetry tracing/metrics per docs/35_INFRASTRUCTURE_AND_DEPLOYMENT.md. The OTLP
/// exporter only activates when <c>Otel:Endpoint</c> is configured — in dev, tracing still
/// runs (spans are created) but nothing is exported anywhere, avoiding a startup failure when
/// no collector is running locally.
/// </summary>
public static class ObservabilityExtensions
{
    public const string ServiceName = "coffeshop-api";

    public static IServiceCollection AddCoffeshopObservability(this IServiceCollection services, IConfiguration configuration)
    {
        var otlpEndpoint = configuration["Otel:Endpoint"];

        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(ServiceName))
            .WithTracing(tracing =>
            {
                tracing.AddAspNetCoreInstrumentation();
                tracing.AddHttpClientInstrumentation();

                if (!string.IsNullOrEmpty(otlpEndpoint))
                {
                    tracing.AddOtlpExporter(otlp => otlp.Endpoint = new Uri(otlpEndpoint));
                }
            })
            .WithMetrics(metrics =>
            {
                metrics.AddAspNetCoreInstrumentation();
                metrics.AddHttpClientInstrumentation();
                metrics.AddRuntimeInstrumentation();

                if (!string.IsNullOrEmpty(otlpEndpoint))
                {
                    metrics.AddOtlpExporter(otlp => otlp.Endpoint = new Uri(otlpEndpoint));
                }
            });

        return services;
    }
}
