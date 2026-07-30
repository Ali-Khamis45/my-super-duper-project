namespace Coffeshop.Application.Common.Interfaces;

/// <summary>
/// Wraps <c>DbContext.SaveChangesAsync</c>. Called exactly once per request, from
/// <c>UnitOfWorkBehavior</c> — never directly from a handler, per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's repository rules.
/// </summary>
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct);
}
