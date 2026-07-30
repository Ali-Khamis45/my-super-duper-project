using Coffeshop.Domain.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace Coffeshop.Identity.Authorization;

/// <summary>
/// Dynamically builds an authorization policy for any policy name matching a known
/// <see cref="PermissionCodes"/> code, so a new permission never requires a matching
/// <c>services.AddAuthorization(o =&gt; o.AddPolicy(...))</c> line to go with it — the
/// permission catalog is the single source of truth, per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's naming conventions.
/// </summary>
public sealed class PermissionAuthorizationPolicyProvider(IOptions<AuthorizationOptions> options)
    : DefaultAuthorizationPolicyProvider(options)
{
    public override async Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (PermissionCodes.AllWithDescriptions.ContainsKey(policyName))
        {
            return new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .AddRequirements(new PermissionRequirement(policyName))
                .Build();
        }

        return await base.GetPolicyAsync(policyName);
    }
}
