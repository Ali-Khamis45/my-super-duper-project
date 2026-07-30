namespace Coffeshop.Application.Common.Options;

/// <summary>
/// Bound from configuration's <c>Auth</c> section. Token signing details (key/issuer/audience)
/// live in Coffeshop.Identity's own options, not here — this holds only what the Application
/// layer itself needs (link-building, token lifetimes for the domain calls that mint them).
/// </summary>
public sealed class AuthOptions
{
    public const string SectionName = "Auth";

    public string FrontendBaseUrl { get; init; } = string.Empty;

    public int AccessTokenLifetimeMinutes { get; init; } = 15;

    public int RefreshTokenLifetimeDays { get; init; } = 30;

    public int EmailVerificationTokenLifetimeHours { get; init; } = 24;

    public int PasswordResetTokenLifetimeMinutes { get; init; } = 30;
}
