using Coffeshop.Domain.Identity.Events;
using Coffeshop.Domain.Identity.Exceptions;
using Coffeshop.Domain.Identity.ValueObjects;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Identity;

/// <summary>
/// The Identity &amp; Access aggregate root, per docs/30_COMMERCE_DDD_MODEL.md. Owns
/// <see cref="RefreshToken"/>/<see cref="EmailVerificationToken"/>/<see cref="PasswordResetToken"/>
/// as internal entities; references <see cref="RoleDefinition"/> only by id
/// (<see cref="RoleIds"/>), since that's a separate aggregate. Every mutation is a named
/// method expressing a real domain operation — no public setters, per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's entity rules.
/// </summary>
public sealed class User : AuditableEntity<Guid>
{
    private readonly List<RefreshToken> _refreshTokens = [];
    private readonly List<EmailVerificationToken> _emailVerificationTokens = [];
    private readonly List<PasswordResetToken> _passwordResetTokens = [];
    private readonly List<Guid> _roleIds = [];

    public Email Email { get; private set; } = null!;

    public HashedPassword HashedPassword { get; private set; } = null!;

    public FullName FullName { get; private set; } = null!;

    public bool IsEmailVerified { get; private set; }

    public DateTimeOffset? LastLoginAtUtc { get; private set; }

    public IReadOnlyCollection<Guid> RoleIds => _roleIds.AsReadOnly();

    public IReadOnlyCollection<RefreshToken> RefreshTokens => _refreshTokens.AsReadOnly();

    public IReadOnlyCollection<EmailVerificationToken> EmailVerificationTokens => _emailVerificationTokens.AsReadOnly();

    public IReadOnlyCollection<PasswordResetToken> PasswordResetTokens => _passwordResetTokens.AsReadOnly();

    private User()
    {
    }

    public static User Register(Email email, HashedPassword hashedPassword, FullName fullName, Guid defaultRoleId)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            HashedPassword = hashedPassword,
            FullName = fullName,
            IsEmailVerified = false,
        };

        user._roleIds.Add(defaultRoleId);
        user.AddDomainEvent(new UserRegisteredEvent(user.Id, email.Value, DateTimeOffset.UtcNow));
        return user;
    }

    public EmailVerificationToken GenerateEmailVerificationToken(string tokenHash, DateTimeOffset expiresAtUtc)
    {
        var token = EmailVerificationToken.Issue(Id, tokenHash, expiresAtUtc);
        _emailVerificationTokens.Add(token);
        return token;
    }

    public void VerifyEmail(string tokenHash)
    {
        var token = _emailVerificationTokens
            .Where(t => t.TokenHash == tokenHash)
            .OrderByDescending(t => t.CreatedAtUtc)
            .FirstOrDefault();

        if (token is null || !token.IsValid)
        {
            throw new InvalidOrExpiredTokenException("This email verification link is invalid or has expired.");
        }

        token.Consume();
        IsEmailVerified = true;
        AddDomainEvent(new EmailVerifiedEvent(Id, DateTimeOffset.UtcNow));
    }

    public PasswordResetToken RequestPasswordReset(string tokenHash, DateTimeOffset expiresAtUtc)
    {
        var token = PasswordResetToken.Issue(Id, tokenHash, expiresAtUtc);
        _passwordResetTokens.Add(token);
        AddDomainEvent(new PasswordResetRequestedEvent(Id, expiresAtUtc));
        return token;
    }

    public void ResetPassword(string tokenHash, HashedPassword newHashedPassword, string? revokedByIp)
    {
        var token = _passwordResetTokens
            .Where(t => t.TokenHash == tokenHash)
            .OrderByDescending(t => t.CreatedAtUtc)
            .FirstOrDefault();

        if (token is null || !token.IsValid)
        {
            throw new InvalidOrExpiredTokenException("This password reset link is invalid or has expired.");
        }

        token.Consume();
        HashedPassword = newHashedPassword;
        RevokeAllRefreshTokens("password-reset", revokedByIp);
        AddDomainEvent(new PasswordChangedEvent(Id, DateTimeOffset.UtcNow));
    }

    public void ChangePassword(HashedPassword newHashedPassword)
    {
        HashedPassword = newHashedPassword;
        AddDomainEvent(new PasswordChangedEvent(Id, DateTimeOffset.UtcNow));
    }

    public void RecordLogin(string? ipAddress, string? userAgent)
    {
        LastLoginAtUtc = DateTimeOffset.UtcNow;
        AddDomainEvent(new UserLoggedInEvent(Id, ipAddress, userAgent, LastLoginAtUtc.Value));
    }

    public RefreshToken IssueRefreshToken(
        string tokenHash,
        DateTimeOffset expiresAtUtc,
        string? createdByIp,
        string? deviceName,
        string? userAgent)
    {
        var token = RefreshToken.Issue(Id, tokenHash, expiresAtUtc, createdByIp, deviceName, userAgent);
        _refreshTokens.Add(token);
        return token;
    }

    /// <summary>
    /// Redeems <paramref name="currentTokenHash"/> and issues its rotated replacement.
    /// Throws <see cref="RefreshTokenReuseDetectedException"/> and revokes every refresh
    /// token for this user if the presented token was already revoked (reuse) — the security
    /// response specified in docs/33_AUTH_ARCHITECTURE.md's silent-refresh sequence diagram.
    /// </summary>
    public RefreshToken RotateRefreshToken(
        string currentTokenHash,
        string newTokenHash,
        DateTimeOffset newExpiresAtUtc,
        string? ipAddress,
        string? deviceName,
        string? userAgent)
    {
        var current = _refreshTokens.SingleOrDefault(t => t.TokenHash == currentTokenHash);

        if (current is null)
        {
            throw new InvalidOrExpiredTokenException("This refresh token is not recognized.");
        }

        if (current.IsRevoked)
        {
            // Only a token revoked *by rotation* (superseded by a newer one, ReplacedByTokenId
            // set) presented again is a real reuse signal worth a revoke-all response — that's
            // the "stolen, already-used-by-the-legitimate-holder" scenario docs/33_AUTH_ARCHITECTURE.md
            // describes. A token revoked for any other reason (explicit logout, revoke-session,
            // password reset) being presented again just means the caller has a stale cookie —
            // an ordinary invalid-token failure, not an attack signal. Conflating the two was a
            // real bug found during this sprint's manual verification: revoking one session and
            // then refreshing with that same session's cookie was cascading into revoking every
            // other session too.
            if (current.ReplacedByTokenId is not null)
            {
                AddDomainEvent(new RefreshTokenReusedEvent(Id, current.Id));
                RevokeAllRefreshTokens("reuse-detected", ipAddress);
                throw new RefreshTokenReuseDetectedException();
            }

            throw new InvalidOrExpiredTokenException("This refresh token is no longer valid.");
        }

        if (current.IsExpired)
        {
            throw new InvalidOrExpiredTokenException("This refresh token has expired.");
        }

        var replacement = RefreshToken.Issue(Id, newTokenHash, newExpiresAtUtc, ipAddress, deviceName, userAgent);
        _refreshTokens.Add(replacement);
        current.Revoke("rotated", ipAddress, replacement.Id);
        current.RecordUsage();

        return replacement;
    }

    public void RevokeRefreshToken(Guid tokenId, string reason, string? revokedByIp)
    {
        var token = _refreshTokens.SingleOrDefault(t => t.Id == tokenId)
            ?? throw new InvalidOrExpiredTokenException("This session was not found.");

        if (!token.IsActive)
        {
            return;
        }

        token.Revoke(reason, revokedByIp);
        AddDomainEvent(new RefreshTokenRevokedEvent(Id, token.Id, reason));
    }

    public void RevokeAllRefreshTokens(string reason, string? revokedByIp)
    {
        foreach (var token in _refreshTokens.Where(t => t.IsActive))
        {
            token.Revoke(reason, revokedByIp);
            AddDomainEvent(new RefreshTokenRevokedEvent(Id, token.Id, reason));
        }
    }

    public void AssignRole(Guid roleId)
    {
        if (!_roleIds.Contains(roleId))
        {
            _roleIds.Add(roleId);
        }
    }

    public void RemoveRole(Guid roleId) => _roleIds.Remove(roleId);
}
