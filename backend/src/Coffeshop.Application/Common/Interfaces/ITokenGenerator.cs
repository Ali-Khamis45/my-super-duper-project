namespace Coffeshop.Application.Common.Interfaces;

/// <summary>
/// Generates a cryptographically random opaque token for refresh/verification/reset flows.
/// Returns both the raw value (sent to the client, never persisted) and its SHA-256 hash
/// (persisted, per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's security checklist).
/// Implemented in Coffeshop.Identity.
/// </summary>
public interface ITokenGenerator
{
    (string RawValue, string Hash) Generate();

    string Hash(string rawValue);
}
