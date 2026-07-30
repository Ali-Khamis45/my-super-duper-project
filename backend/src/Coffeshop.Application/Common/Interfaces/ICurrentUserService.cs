namespace Coffeshop.Application.Common.Interfaces;

/// <summary>
/// Reads the authenticated caller's identity from the current JWT's claims — implemented in
/// Coffeshop.Api against <c>HttpContext.User</c> (kept out of Application to avoid an
/// ASP.NET Core dependency here). <see cref="UserId"/> is <c>null</c> for an anonymous
/// request, a fully-supported state per docs/33_AUTH_ARCHITECTURE.md.
/// </summary>
public interface ICurrentUserService
{
    Guid? UserId { get; }

    string? IpAddress { get; }

    string? UserAgent { get; }
}
