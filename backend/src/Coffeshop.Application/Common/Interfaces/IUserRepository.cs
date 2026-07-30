using Coffeshop.Domain.Identity;

namespace Coffeshop.Application.Common.Interfaces;

/// <summary>
/// Per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md's generic <c>IRepository&lt;TAggregate, TId&gt;</c>
/// base, extended additively with the token-hash lookups this sprint's flows need — a
/// verification/reset/refresh link carries only a token, not a known user id, so the
/// repository (not the caller) searches across users for the matching hash.
/// </summary>
public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct);

    Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken ct);

    Task<User?> GetByRefreshTokenHashAsync(string tokenHash, CancellationToken ct);

    Task<User?> GetByEmailVerificationTokenHashAsync(string tokenHash, CancellationToken ct);

    Task<User?> GetByPasswordResetTokenHashAsync(string tokenHash, CancellationToken ct);

    Task<bool> ExistsByEmailAsync(string normalizedEmail, CancellationToken ct);

    void Add(User user);
}
