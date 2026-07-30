using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Identity;

/// <summary>
/// A single-use, time-limited token authorizing exactly one password reset. Same
/// hash-not-raw-value convention as <see cref="RefreshToken"/>/<see cref="EmailVerificationToken"/>.
/// </summary>
public sealed class PasswordResetToken : Entity<Guid>
{
    public Guid UserId { get; private set; }

    public string TokenHash { get; private set; } = null!;

    public DateTimeOffset ExpiresAtUtc { get; private set; }

    public DateTimeOffset CreatedAtUtc { get; private set; }

    public DateTimeOffset? ConsumedAtUtc { get; private set; }

    public bool IsExpired => DateTimeOffset.UtcNow >= ExpiresAtUtc;

    public bool IsConsumed => ConsumedAtUtc is not null;

    public bool IsValid => !IsExpired && !IsConsumed;

    private PasswordResetToken()
    {
    }

    internal static PasswordResetToken Issue(Guid userId, string tokenHash, DateTimeOffset expiresAtUtc) =>
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
