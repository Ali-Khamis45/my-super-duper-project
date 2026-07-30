using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Domain.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Coffeshop.Identity.Services;

/// <summary>
/// Issues the 15-minute JWT access token per docs/33_AUTH_ARCHITECTURE.md's token strategy.
/// Claims are flattened at issuance (sub/email/role/permission) so authorization never needs a
/// database round trip per request — see docs/36_SECURITY_MODEL.md's note on why this is safe
/// despite roles being able to change (bounded by the token's own short lifetime).
/// </summary>
public sealed class JwtTokenService(IOptions<JwtOptions> options) : IJwtTokenService
{
    private readonly JwtOptions _options = options.Value;

    public AccessToken IssueAccessToken(User user, IReadOnlyCollection<RoleDefinition> roles)
    {
        var expiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(_options.AccessTokenLifetimeMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email.Value),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("email_verified", user.IsEmailVerified.ToString()),
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role.Name)));

        var permissionCodes = roles.SelectMany(role => role.PermissionCodes).Distinct();
        claims.AddRange(permissionCodes.Select(code => new Claim("permission", code)));

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAtUtc.UtcDateTime,
            signingCredentials: credentials);

        var value = new JwtSecurityTokenHandler().WriteToken(token);

        return new AccessToken(value, expiresAtUtc);
    }
}
