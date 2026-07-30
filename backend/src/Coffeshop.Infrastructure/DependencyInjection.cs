using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Options;
using Coffeshop.Infrastructure.Email;
using Coffeshop.Infrastructure.Observability;
using Coffeshop.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Coffeshop.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AuthOptions>(configuration.GetSection(AuthOptions.SectionName));
        services.Configure<SmtpOptions>(configuration.GetSection(SmtpOptions.SectionName));

        services.AddSingleton<IClock, SystemClock>();
        services.AddTransient<IEmailSender, SmtpEmailSender>();

        services.AddCoffeshopObservability(configuration);

        // Rate limiting is registered in Coffeshop.Api directly (Coffeshop.Api/RateLimiting) —
        // Microsoft.AspNetCore.RateLimiting's DI extension methods weren't resolving through
        // this project's plain-classlib FrameworkReference the way other ASP.NET Core
        // packages (JwtBearer, Authorization) did; rather than chase that further, pipeline
        // policy registration is arguably Api's composition-root concern anyway.

        return services;
    }
}
