using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Identity.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Repositories;

/// <summary>
/// Per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's repository rules — returns aggregates or
/// <c>null</c>, never <c>IQueryable</c>. Owned collections (RefreshTokens/etc.) are always
/// loaded with their owner, so no explicit <c>Include</c> is needed.
///
/// Email comparisons compare the whole <c>Email</c> value object (<c>u.Email == Email.Create(x)</c>),
/// never <c>u.Email.Value == x</c> — EF Core's value-converter translation applies the same
/// converter to both sides of a comparison against the property's own CLR type, but can't
/// translate an arbitrary member access (<c>.Value</c>) on the converted type. A real bug
/// found during this sprint's manual verification, not caught by any static check.
/// </summary>
public sealed class UserRepository(CoffeshopDbContext context) : IUserRepository
{
    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct) =>
        context.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

    public Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken ct) =>
        context.Users.FirstOrDefaultAsync(u => u.Email == Email.Create(normalizedEmail), ct);

    public Task<User?> GetByRefreshTokenHashAsync(string tokenHash, CancellationToken ct) =>
        context.Users.FirstOrDefaultAsync(u => u.RefreshTokens.Any(t => t.TokenHash == tokenHash), ct);

    public Task<User?> GetByEmailVerificationTokenHashAsync(string tokenHash, CancellationToken ct) =>
        context.Users.FirstOrDefaultAsync(u => u.EmailVerificationTokens.Any(t => t.TokenHash == tokenHash), ct);

    public Task<User?> GetByPasswordResetTokenHashAsync(string tokenHash, CancellationToken ct) =>
        context.Users.FirstOrDefaultAsync(u => u.PasswordResetTokens.Any(t => t.TokenHash == tokenHash), ct);

    public Task<bool> ExistsByEmailAsync(string normalizedEmail, CancellationToken ct) =>
        context.Users.AnyAsync(u => u.Email == Email.Create(normalizedEmail), ct);

    public void Add(User user) => context.Users.Add(user);
}
