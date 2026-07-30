using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Identity;

/// <summary>
/// A single-use, time-limited token proving control of the account's email address.
/// Stores a SHA-256 hash of the raw token, matching <see cref="RefreshToken"/>'s convention —
/// only ever constructed/consumed through <see cref="User"/>.
/// </summary>
public sealed class EmailVerificationToken : Entity<Guid>
{
    public Guid UserId { get; private set; }

    public string TokenHash { get; private set; } = null!;

    public DateTimeOffset ExpiresAtUtc { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }

    public DateTimeOffset? ConsumedAtUtc { get; private set; }

    public bool IsExpired => DateTimeOffset.UtcNow >= ExpiresAtUtc;

    public bool IsConsumed => ConsumedAtUtc is not null;

    public bool IsValid => !IsExpired && !IsConsumed;

    private EmailVerificationToken()
    {
    }

    internal static EmailVerificationToken Issue(Guid userId, string tokenHash, DateTimeOffset expiresAtUtc) =>
        new()
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAtUtc = expiresAtUtc,
            CreatedAtUtc = DateTimeOffset.UtcNow,
        };

    internal void Consume() => ConsumedAtUtc = DateTimeOffset.UtcNow;
}
