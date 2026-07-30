using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Identity.Events;

/// <summary>
/// Event payload shapes per docs/32_COMMERCE_EVENT_CATALOG.md's Identity &amp; Access row.
/// <see cref="RefreshTokenReusedEvent"/> is additive (named in docs/33/36 but not in the
/// original 26-event table) — a new event row, never a change to an existing one, per
/// docs/37_API_STABILITY_POLICY.md's extension mechanism 2.
/// </summary>
public sealed record UserRegisteredEvent(Guid UserId, string Email, DateTimeOffset RegisteredAtUtc) : DomainEvent;

public sealed record EmailVerifiedEvent(Guid UserId, DateTimeOffset VerifiedAtUtc) : DomainEvent;

public sealed record PasswordResetRequestedEvent(Guid UserId, DateTimeOffset ResetTokenExpiresAtUtc) : DomainEvent;

public sealed record PasswordChangedEvent(Guid UserId, DateTimeOffset ChangedAtUtc) : DomainEvent;

public sealed record UserLoggedInEvent(Guid UserId, string? IpAddress, string? UserAgent, DateTimeOffset AtUtc) : DomainEvent;

public sealed record RefreshTokenRevokedEvent(Guid UserId, Guid TokenId, string Reason) : DomainEvent;

public sealed record RefreshTokenReusedEvent(Guid UserId, Guid TokenId) : DomainEvent;
