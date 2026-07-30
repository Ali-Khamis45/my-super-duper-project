using System.Security.Claims;
using Coffeshop.Application.Common.Interfaces;

namespace Coffeshop.Api.Services;

/// <summary>
/// Reads the authenticated caller's identity from <c>HttpContext.User</c> — the ASP.NET Core
/// implementation of the interface Application depends on, per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's dependency-inversion convention. Scoped, since
/// it wraps a per-request <see cref="IHttpContextAccessor"/>.
/// </summary>
public sealed class HttpCurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public Guid? UserId
    {
        get
        {
            var sub = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? httpContextAccessor.HttpContext?.User.FindFirstValue("sub");

            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public string? IpAddress => httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();

    public string? UserAgent => httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString();

    public IReadOnlyCollection<string> Permissions =>
        httpContextAccessor.HttpContext?.User.FindAll("permission").Select(c => c.Value).ToArray() ?? [];
}
