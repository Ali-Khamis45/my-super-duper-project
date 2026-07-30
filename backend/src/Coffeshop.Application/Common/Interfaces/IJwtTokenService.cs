using Coffeshop.Domain.Identity;

namespace Coffeshop.Application.Common.Interfaces;

public sealed record AccessToken(string Value, DateTimeOffset ExpiresAtUtc);

/// <summary>
/// Issues the 15-minute JWT access token per docs/33_AUTH_ARCHITECTURE.md's token strategy —
/// claims include <c>sub</c>/<c>email</c>/<c>roles</c>/<c>permissions</c>, flattened at
/// issuance so authorization never needs a database round trip per request. Implemented in
/// Coffeshop.Identity.
/// </summary>
public interface IJwtTokenService
{
    AccessToken IssueAccessToken(User user, IReadOnlyCollection<RoleDefinition> roles);
}
