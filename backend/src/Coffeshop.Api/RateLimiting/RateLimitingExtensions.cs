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
    /// <summary>Additive (Sprint 5.5) — tighter than <see cref="PerUserPolicy"/>'s general 60/min: a checkout/retry attempt is financially meaningful in a way an ordinary read isn't, so it gets its own, stricter budget. Deliberately applied only to <c>/payments/create-session</c>/<c>/confirm</c>/<c>/{id}/cancel</c> — never the webhook endpoint, which has no real per-user identity to key on and must accept a gateway's own retry cadence; signature verification is that endpoint's real gate, not a request-volume ceiling (see docs/36_SECURITY_MODEL.md's own Sprint 5.5 note).</summary>
    public const string PaymentPolicy = "payment";

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

            // Layer 4 — a real, financially-meaningful action, keyed by IP (like AuthPolicy, not
            // PerUserPolicy) since checkout/payment endpoints are reachable anonymously for
            // guest orders, same as order creation itself.
            options.AddPolicy(PaymentPolicy, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    factory: _ => new FixedWindowRateLimiterOptions
                    {
                        PermitLimit = 20,
                        Window = TimeSpan.FromMinutes(1),
                    }));
        });

        return services;
    }
}
