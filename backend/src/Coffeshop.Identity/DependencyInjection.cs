using System.Text;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Identity.Authorization;
using Coffeshop.Identity.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Coffeshop.Identity;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

        services.AddSingleton<IPasswordHasher, PasswordHasherService>();
        services.AddSingleton<ITokenGenerator, TokenGeneratorService>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer();

        // Configured via AddOptions<T>().Configure<TDep>(...), not a value read eagerly
        // inside this method body — a real bug found during this sprint's integration
        // testing: an eager `configuration.GetSection(...).Get<JwtOptions>()` call here
        // captured whatever the Jwt section looked like at the moment this method ran, before
        // any config source layered in afterward (a test host's config overrides, in
        // particular) had been merged. IJwtTokenService (which resolves IOptions<JwtOptions>
        // lazily, at first use) picked up the override correctly and signed a token with it;
        // this eager read did not, so JwtBearer validated incoming tokens against a stale
        // (effectively empty) signing key — every authenticated request failed with
        // "the signature key was not found" despite login succeeding moments earlier.
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>>((bearerOptions, jwtOptionsAccessor) =>
            {
                var jwtOptions = jwtOptionsAccessor.Value;

                bearerOptions.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtOptions.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
            });

        services.AddSingleton<IAuthorizationPolicyProvider, PermissionAuthorizationPolicyProvider>();
        services.AddSingleton<IAuthorizationHandler, PermissionAuthorizationHandler>();
        services.AddAuthorizationBuilder();

        return services;
    }
}
