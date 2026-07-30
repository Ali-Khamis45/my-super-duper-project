using Microsoft.AspNetCore.Authorization;

namespace Coffeshop.Identity.Authorization;

public sealed class PermissionRequirement(string permission) : IAuthorizationRequirement
{
    public string Permission { get; } = permission;
}

/// <summary>
/// Checks for a <c>"permission"</c> claim matching the requirement — per
/// docs/33_AUTH_ARCHITECTURE.md's rule that authorization always targets a permission, never
/// a role name directly.
/// </summary>
public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        if (context.User.HasClaim("permission", requirement.Permission))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
