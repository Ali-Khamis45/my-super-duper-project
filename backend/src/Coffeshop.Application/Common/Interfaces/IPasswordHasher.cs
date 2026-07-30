using Coffeshop.Domain.Identity.ValueObjects;

namespace Coffeshop.Application.Common.Interfaces;

/// <summary>
/// Implemented in Coffeshop.Identity by wrapping ASP.NET Core Identity's
/// <c>PasswordHasher&lt;User&gt;</c> utility class (PBKDF2) — per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's security checklist, never a custom hash.
/// </summary>
public interface IPasswordHasher
{
    HashedPassword Hash(string plainTextPassword);

    bool Verify(HashedPassword hashedPassword, string plainTextPassword);
}
