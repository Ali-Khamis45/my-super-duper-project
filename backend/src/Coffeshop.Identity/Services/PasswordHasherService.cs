using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Identity.ValueObjects;
using Microsoft.AspNetCore.Identity;

namespace Coffeshop.Identity.Services;

/// <summary>
/// Wraps ASP.NET Core Identity's <see cref="PasswordHasher{TUser}"/> utility class (PBKDF2) —
/// used standalone, not the full Identity Framework (no <c>UserManager</c>/Identity tables),
/// since <see cref="User"/> is this project's own DDD aggregate, per ADR-0010.
/// </summary>
public sealed class PasswordHasherService : IPasswordHasher
{
    private readonly PasswordHasher<User> _hasher = new();

    public HashedPassword Hash(string plainTextPassword) =>
        HashedPassword.FromHash(_hasher.HashPassword(null!, plainTextPassword));

    public bool Verify(HashedPassword hashedPassword, string plainTextPassword)
    {
        var result = _hasher.VerifyHashedPassword(null!, hashedPassword.Value, plainTextPassword);
        return result is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded;
    }
}
