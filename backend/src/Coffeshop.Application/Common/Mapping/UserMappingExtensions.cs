using Coffeshop.Application.Common.Dtos;
using Coffeshop.Domain.Identity;

namespace Coffeshop.Application.Common.Mapping;

/// <summary>
/// Hand-written mapping, deliberately not a reflection-based mapper — per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's DTO mapping rules.
/// </summary>
public static class UserMappingExtensions
{
    public static UserDto ToDto(this User user, IReadOnlyCollection<RoleDefinition> roles) =>
        new(
            user.Id,
            user.Email.Value,
            user.FullName.Value,
            user.IsEmailVerified,
            [.. roles.Select(r => r.Name)],
            [.. roles.SelectMany(r => r.PermissionCodes).Distinct()]);

    public static SessionDto ToSessionDto(this RefreshToken token, bool isCurrent) =>
        new(
            token.Id,
            token.DeviceName,
            token.UserAgent,
            token.CreatedAtUtc,
            token.LastUsedAtUtc,
            token.ExpiresAtUtc,
            isCurrent);
}
