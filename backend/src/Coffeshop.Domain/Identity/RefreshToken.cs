using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Identity;

/// <summary>
/// Per docs/30_COMMERCE_DDD_MODEL.md, an entity inside the <see cref="User"/> aggregate — and,
/// per docs/33_AUTH_ARCHITECTURE.md, the thing that <b>is</b> a session: one per device/browser,
/// carrying the device/session metadata a "Session" concept would otherwise duplicate.
/// (Sprint 5.1's brief also named a separate "Session entity" — resolved in favor of the
/// already-frozen doc 33 design rather than introducing a second, competing concept; see
/// docs/reviews/sprint-5.1-review.md's Lessons Learned.)
///
/// Only ever constructed/mutated through <see cref="User"/>'s own methods — never
/// <c>new RefreshToken(...)</c> from outside this file. Stores a SHA-256 hash of the token
/// value, never the raw token (docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's security checklist)
/// — the raw value exists only in the HttpOnly cookie and the moment it's minted.
/// </summary>
public sealed class RefreshToken : Entity<Guid>
{
    public Guid UserId { get; private set; }

    public string TokenHash { get; private set; } = null!;

    public DateTimeOffset ExpiresAtUtc { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }

    public string? CreatedByIp { get; private set; }

    public string? DeviceName { get; private set; }

    public string? UserAgent { get; private set; }

    public DateTimeOffset? LastUsedAtUtc { get; private set; }

    public DateTimeOffset? RevokedAtUtc { get; private set; }

    public string? RevokedByIp { get; private set; }

    public string? ReasonRevoked { get; private set; }

    /// <summary>Set to the replacement's id when rotated — the chain reuse-detection walks.</summary>
    public Guid? ReplacedByTokenId { get; private set; }

    public bool IsExpired => DateTimeOffset.UtcNow >= ExpiresAtUtc;

    public bool IsRevoked => RevokedAtUtc is not null;

    public bool IsActive => !IsRevoked && !IsExpired;

    private RefreshToken()
    {
    }

    internal static RefreshToken Issue(
        Guid userId,
        string tokenHash,
        DateTimeOffset expiresAtUtc,
        string? createdByIp,
        string? deviceName,
        string? userAgent) =>
        new()
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAtUtc = expiresAtUtc,
            CreatedAtUtc = DateTimeOffset.UtcNow,
            CreatedByIp = createdByIp,
            DeviceName = deviceName,
            UserAgent = userAgent,
        };

    internal void RecordUsage() => LastUsedAtUtc = DateTimeOffset.UtcNow;

    internal void Revoke(string reason, string? revokedByIp, Guid? replacedByTokenId = null)
    {
        RevokedAtUtc = DateTimeOffset.UtcNow;
        RevokedByIp = revokedByIp;
        ReasonRevoked = reason;
        ReplacedByTokenId = replacedByTokenId;
    }
}
