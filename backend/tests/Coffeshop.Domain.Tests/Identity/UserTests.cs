using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Identity.Events;
using Coffeshop.Domain.Identity.Exceptions;
using Coffeshop.Domain.Identity.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Coffeshop.Domain.Tests.Identity;

public sealed class UserTests
{
    private static readonly Guid DefaultRoleId = Guid.NewGuid();

    private static User CreateUser() =>
        User.Register(
            Email.Create("alice@example.com"),
            HashedPassword.FromHash("hashed-value"),
            FullName.Create("Alice Barista"),
            DefaultRoleId);

    [Fact]
    public void Register_ValidInput_CreatesUnverifiedUserWithDefaultRole()
    {
        var user = CreateUser();

        user.Email.Value.Should().Be("alice@example.com");
        user.IsEmailVerified.Should().BeFalse();
        user.RoleIds.Should().ContainSingle().Which.Should().Be(DefaultRoleId);
    }

    [Fact]
    public void Register_RaisesUserRegisteredEvent()
    {
        var user = CreateUser();

        user.DomainEvents.Should().ContainSingle(e => e is UserRegisteredEvent);
    }

    [Fact]
    public void VerifyEmail_ValidToken_MarksVerifiedAndConsumesToken()
    {
        var user = CreateUser();
        var token = user.GenerateEmailVerificationToken("hash-1", DateTimeOffset.UtcNow.AddHours(24));

        user.VerifyEmail("hash-1");

        user.IsEmailVerified.Should().BeTrue();
        token.IsConsumed.Should().BeTrue();
        user.DomainEvents.Should().Contain(e => e is EmailVerifiedEvent);
    }

    [Fact]
    public void VerifyEmail_UnknownToken_ThrowsInvalidOrExpiredTokenException()
    {
        var user = CreateUser();

        var act = () => user.VerifyEmail("never-issued");

        act.Should().Throw<InvalidOrExpiredTokenException>();
    }

    [Fact]
    public void VerifyEmail_ExpiredToken_ThrowsInvalidOrExpiredTokenException()
    {
        var user = CreateUser();
        user.GenerateEmailVerificationToken("hash-1", DateTimeOffset.UtcNow.AddHours(-1));

        var act = () => user.VerifyEmail("hash-1");

        act.Should().Throw<InvalidOrExpiredTokenException>();
    }

    [Fact]
    public void VerifyEmail_AlreadyConsumedToken_ThrowsInvalidOrExpiredTokenException()
    {
        var user = CreateUser();
        user.GenerateEmailVerificationToken("hash-1", DateTimeOffset.UtcNow.AddHours(24));
        user.VerifyEmail("hash-1");

        var act = () => user.VerifyEmail("hash-1");

        act.Should().Throw<InvalidOrExpiredTokenException>();
    }

    [Fact]
    public void ResetPassword_ValidToken_ChangesPasswordAndRevokesAllActiveSessions()
    {
        var user = CreateUser();
        user.IssueRefreshToken("refresh-hash-1", DateTimeOffset.UtcNow.AddDays(30), null, null, null);
        var resetToken = user.RequestPasswordReset("reset-hash-1", DateTimeOffset.UtcNow.AddMinutes(30));
        var newPassword = HashedPassword.FromHash("new-hash");

        user.ResetPassword("reset-hash-1", newPassword, null);

        user.HashedPassword.Should().Be(newPassword);
        resetToken.IsConsumed.Should().BeTrue();
        user.RefreshTokens.Should().OnlyContain(t => t.IsRevoked);
        user.DomainEvents.Should().Contain(e => e is PasswordChangedEvent);
    }

    [Fact]
    public void ResetPassword_ExpiredToken_ThrowsAndDoesNotChangePassword()
    {
        var user = CreateUser();
        var originalPassword = user.HashedPassword;
        user.RequestPasswordReset("reset-hash-1", DateTimeOffset.UtcNow.AddMinutes(-1));

        var act = () => user.ResetPassword("reset-hash-1", HashedPassword.FromHash("new-hash"), null);

        act.Should().Throw<InvalidOrExpiredTokenException>();
        user.HashedPassword.Should().Be(originalPassword);
    }

    [Fact]
    public void RotateRefreshToken_ValidToken_IssuesReplacementAndRevokesOriginal()
    {
        var user = CreateUser();
        user.IssueRefreshToken("current-hash", DateTimeOffset.UtcNow.AddDays(30), null, null, null);

        var replacement = user.RotateRefreshToken("current-hash", "new-hash", DateTimeOffset.UtcNow.AddDays(30), null, null, null);

        var original = user.RefreshTokens.Single(t => t.TokenHash == "current-hash");
        original.IsRevoked.Should().BeTrue();
        original.ReplacedByTokenId.Should().Be(replacement.Id);
        replacement.IsActive.Should().BeTrue();
    }

    [Fact]
    public void RotateRefreshToken_ExpiredToken_ThrowsInvalidOrExpiredTokenException()
    {
        var user = CreateUser();
        user.IssueRefreshToken("current-hash", DateTimeOffset.UtcNow.AddDays(-1), null, null, null);

        var act = () => user.RotateRefreshToken("current-hash", "new-hash", DateTimeOffset.UtcNow.AddDays(30), null, null, null);

        act.Should().Throw<InvalidOrExpiredTokenException>();
    }

    [Fact]
    public void RotateRefreshToken_UnknownToken_ThrowsInvalidOrExpiredTokenException()
    {
        var user = CreateUser();

        var act = () => user.RotateRefreshToken("never-issued", "new-hash", DateTimeOffset.UtcNow.AddDays(30), null, null, null);

        act.Should().Throw<InvalidOrExpiredTokenException>();
    }

    /// <summary>
    /// The real reuse-attack scenario: a token that was already rotated away (superseded by a
    /// newer one) gets presented again — per docs/33_AUTH_ARCHITECTURE.md, this is the genuine
    /// theft/reuse signal and must revoke every session, not just fail quietly.
    /// </summary>
    [Fact]
    public void RotateRefreshToken_TokenAlreadyRotatedAway_ThrowsReuseDetectedAndRevokesEverySession()
    {
        var user = CreateUser();
        user.IssueRefreshToken("original-hash", DateTimeOffset.UtcNow.AddDays(30), null, null, null);
        user.IssueRefreshToken("other-device-hash", DateTimeOffset.UtcNow.AddDays(30), null, "Other Device", null);
        user.RotateRefreshToken("original-hash", "rotated-hash", DateTimeOffset.UtcNow.AddDays(30), null, null, null);

        // The original token, now revoked-by-rotation, is presented again.
        var act = () => user.RotateRefreshToken("original-hash", "attacker-hash", DateTimeOffset.UtcNow.AddDays(30), null, null, null);

        act.Should().Throw<RefreshTokenReuseDetectedException>();
        user.RefreshTokens.Should().OnlyContain(t => t.IsRevoked);
        user.DomainEvents.Should().Contain(e => e is RefreshTokenReusedEvent);
    }

    /// <summary>
    /// Regression test for a real bug found during Sprint 5.1's manual verification: revoking
    /// one session (e.g. via /revoke-session or logout) and then presenting that same session's
    /// stale cookie was incorrectly cascading into a full reuse-detection revoke-all. A token
    /// revoked for any reason *other than* rotation is just an ordinary invalid token — the
    /// caller has a stale cookie, not evidence of theft — and must not affect any other session.
    /// </summary>
    [Fact]
    public void RotateRefreshToken_TokenRevokedByLogoutNotRotation_ThrowsInvalidTokenWithoutRevokingOtherSessions()
    {
        var user = CreateUser();
        var revoked = user.IssueRefreshToken("logged-out-hash", DateTimeOffset.UtcNow.AddDays(30), null, null, null);
        var other = user.IssueRefreshToken("other-device-hash", DateTimeOffset.UtcNow.AddDays(30), null, "Other Device", null);
        user.RevokeRefreshToken(revoked.Id, "logout", null);

        var act = () => user.RotateRefreshToken("logged-out-hash", "new-hash", DateTimeOffset.UtcNow.AddDays(30), null, null, null);

        act.Should().Throw<InvalidOrExpiredTokenException>()
            .Which.Should().NotBeOfType<RefreshTokenReuseDetectedException>();
        other.IsActive.Should().BeTrue("revoking one session must never cascade to an unrelated session");
    }

    [Fact]
    public void RevokeRefreshToken_ActiveToken_RevokesItAndRaisesEvent()
    {
        var user = CreateUser();
        var token = user.IssueRefreshToken("hash-1", DateTimeOffset.UtcNow.AddDays(30), null, null, null);

        user.RevokeRefreshToken(token.Id, "user-initiated", null);

        token.IsRevoked.Should().BeTrue();
        user.DomainEvents.Should().Contain(e => e is RefreshTokenRevokedEvent);
    }

    [Fact]
    public void RevokeAllRefreshTokens_MultipleActiveTokens_RevokesEveryOne()
    {
        var user = CreateUser();
        user.IssueRefreshToken("hash-1", DateTimeOffset.UtcNow.AddDays(30), null, null, null);
        user.IssueRefreshToken("hash-2", DateTimeOffset.UtcNow.AddDays(30), null, null, null);
        user.IssueRefreshToken("hash-3", DateTimeOffset.UtcNow.AddDays(30), null, null, null);

        user.RevokeAllRefreshTokens("security-response", null);

        user.RefreshTokens.Should().OnlyContain(t => t.IsRevoked);
    }

    [Fact]
    public void AssignRole_SameRoleTwice_IsIdempotent()
    {
        var user = CreateUser();
        var roleId = Guid.NewGuid();

        user.AssignRole(roleId);
        user.AssignRole(roleId);

        user.RoleIds.Count(id => id == roleId).Should().Be(1);
    }
}
