using System.Security.Cryptography;
using System.Text;
using Coffeshop.Application.Common.Interfaces;

namespace Coffeshop.Identity.Services;

/// <summary>
/// Generates a 256-bit cryptographically random opaque token for refresh/verification/reset
/// flows, and its SHA-256 hash (the only form persisted) — per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's security checklist.
/// </summary>
public sealed class TokenGeneratorService : ITokenGenerator
{
    public (string RawValue, string Hash) Generate()
    {
        var raw = Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        return (raw, Hash(raw));
    }

    public string Hash(string rawValue) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(rawValue)));

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
