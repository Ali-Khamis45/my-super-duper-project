using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Options;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Infrastructure.Email;
using Coffeshop.Infrastructure.Observability;
using Coffeshop.Infrastructure.Payments;
using Coffeshop.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Coffeshop.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.SectionName));
        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));
        services.Configure<PaymentsOptions>(configuration.GetSection(PaymentsOptions.SectionName));
        services.Configure<PaymentRetryOptions>(configuration.GetSection(PaymentRetryOptions.SectionName));

        services.AddSingleton<IClock, SystemClock>();
        services.AddTransient<IEmailSender, SmtpEmailSender>();

        // The active IPaymentGateway is chosen once, at startup, from real configuration —
        // never branched on per-request. Defaults to Fake (PaymentsOptions.Provider's own
        // default) so a fresh clone with no Stripe secret configured still runs end to end; see
        // PaymentsOptions's own doc comment for why. FakePaymentGateway holds process-lifetime
        // in-memory state (its own doc comment explains why that's fine for its real, narrow
        // purpose), so it's registered Singleton, not Scoped — StripePaymentGateway is
        // effectively stateless per call (Stripe.net's own services are cheap to construct) and
        // registered the same way for a uniform lifetime across both real implementations.
        services.AddSingleton<IPaymentGateway>(provider =>
        {
            var options = provider.GetRequiredService<IOptions<PaymentsOptions>>();
            return options.Value.Provider.Equals("Stripe", StringComparison.OrdinalIgnoreCase)
                ? new StripePaymentGateway(options, provider.GetRequiredService<ILogger<StripePaymentGateway>>())
                : new FakePaymentGateway(provider.GetRequiredService<ILogger<FakePaymentGateway>>(), options);
        });

        services.AddCoffeshopObservability(configuration);

        // Rate limiting is registered in Coffeshop.Api directly (Coffeshop.Api/RateLimiting) —
        // Microsoft.AspNetCore.RateLimiting's DI extension methods weren't resolving through
        // this project's plain-classlib FrameworkReference the way other ASP.NET Core
        // packages (JwtBearer, Authorization) did; rather than chase that further, pipeline
        // policy registration is arguably Api's composition-root concern anyway.

        return services;
    }
}
