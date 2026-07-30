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

    /// <summary>
    /// Additive (Sprint 5.3) — the caller's flattened permission codes, straight off the JWT's
    /// own <c>"permission"</c> claims (`JwtTokenService`'s own claim name). First real need:
    /// <c>CancelOrderCommand</c>'s handler has to allow *either* "this is the order's own
    /// customer" *or* "this caller has <see cref="Coffeshop.Domain.Identity.PermissionCodes.UpdateOrderStatus"/>"
    /// — a decision that depends on loaded aggregate state (whose order is this), so it can't be
    /// expressed as a static `[Authorize(Policy = ...)]` at the endpoint alone. Empty for an
    /// anonymous request, matching <see cref="UserId"/>'s own "fully-supported anonymous state."
    /// </summary>
    IReadOnlyCollection<string> Permissions { get; }
}
