using Coffeshop.Api.ErrorHandling;
using Coffeshop.Api.RateLimiting;
using Coffeshop.Api.Services;
using Coffeshop.Application;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Identity;
using Coffeshop.Infrastructure;
using Coffeshop.Persistence;
using Microsoft.AspNetCore.Diagnostics;

namespace Coffeshop.Api;

public static class DependencyInjection
{
    public static IServiceCollection AddCoffeshopApi(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddApplication();
        services.AddPersistence(configuration);
        services.AddIdentityInfrastructure(configuration);
        services.AddInfrastructure(configuration);
        services.AddCoffeshopRateLimiting();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, HttpCurrentUserService>();

        services.AddExceptionHandler<GlobalExceptionHandler>();
        services.AddProblemDetails();

        return services;
    }
}
