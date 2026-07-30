namespace Coffeshop.Application.Common.Dtos;

/// <summary>
/// Per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md's DTO-to-frontend-type tracing table
/// (<c>UserDto</c>, new this sprint). Never exposes <c>HashedPassword</c> or <c>RowVersion</c>,
/// per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's DTO mapping rules.
/// </summary>
public sealed record UserDto(
    Guid Id,
    string Email,
    string FullName,
    bool IsEmailVerified,
    IReadOnlyCollection<string> Roles,
    IReadOnlyCollection<string> Permissions);
