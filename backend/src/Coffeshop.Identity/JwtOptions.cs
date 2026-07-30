namespace Coffeshop.Identity;

/// <summary>
/// Bound from configuration's <c>Jwt</c> section. <see cref="SigningKey"/> comes from
/// <c>dotnet user-secrets</c> in dev and the secret manager in production — never a
/// hardcoded string, never committed, per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's
/// security checklist.
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string SigningKey { get; init; } = string.Empty;

    public string Issuer { get; init; } = string.Empty;

    public string Audience { get; init; } = string.Empty;

    public int AccessTokenLifetimeMinutes { get; init; } = 15;
}
