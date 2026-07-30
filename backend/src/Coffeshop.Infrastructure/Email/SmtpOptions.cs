namespace Coffeshop.Infrastructure.Email;

/// <summary>
/// Bound from configuration's <c>Smtp</c> section — points at Mailhog in dev
/// (docker-compose.yml) and a real provider's SMTP relay in production, per
/// docs/35_INFRASTRUCTURE_AND_DEPLOYMENT.md. Never a different code path per environment,
/// only different configuration.
/// </summary>
public sealed class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; init; } = "localhost";

    public int Port { get; init; } = 1025;

    public string? Username { get; init; }

    public string? Password { get; init; }

    public bool UseSsl { get; init; }

    public string FromAddress { get; init; } = "noreply@coffeshop.dev";

    public string FromName { get; init; } = "Coffeshop";
}
