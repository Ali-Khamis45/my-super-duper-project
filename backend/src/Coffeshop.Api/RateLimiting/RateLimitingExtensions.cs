using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;

namespace Coffeshop.Api.RateLimiting;

/// <summary>
/// The three rate-limiting layers named in docs/36_SECURITY_MODEL.md, deliberately kept
/// distinct (per docs/29_COMMERCE_ARCHITECTURE_FREEZE.md scenario 12) rather than conflated
/// into one policy. Fails closed: an unhandled request past these limiters is rejected (429),
/// never silently allowed through.
/// </summary>
public static class RateLimitingExtensions
{
    public const string GlobalPolicy = "global";
    public const string AuthPolicy = "auth";
    public const string PerUserPolicy = "per-user";

    public static IServiceCollection AddCoffeshopRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

            // Layer 1 — coarse per-IP ceiling against volumetric abuse.
            options.AddPolicy(GlobalPolicy, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 100,
                        Window = TimeSpan.FromMinutes(1),
                    }));

            // Layer 2 — tighter, per-IP window for login/register/forgot-password, where
            // brute-force/enumeration risk is highest.
            options.AddPolicy(AuthPolicy, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 10,
                        Window = TimeSpan.FromMinutes(1),
                    }));

            // Layer 3 — per-authenticated-user quota, independent of which IP a request
            // arrives from.
            options.AddPolicy(PerUserPolicy, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: httpContext.User.FindFirst("sub")?.Value
                        ?? httpContext.Connection.RemoteIpAddress?.ToString()
                        ?? "unknown",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 60,
                        Window = TimeSpan.FromMinutes(1),
                    }));
        });

        return services;
    }
}
