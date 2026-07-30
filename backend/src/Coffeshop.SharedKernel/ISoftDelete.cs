namespace Coffeshop.SharedKernel;

/// <summary>
/// Implemented by every auditable aggregate — enables the global EF Core query filter
/// (<c>HasQueryFilter(e =&gt; !e.IsDeleted)</c>) applied uniformly in Coffeshop.Persistence,
/// per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md.
/// </summary>
public interface ISoftDelete
{
    bool IsDeleted { get; }

    DateTimeOffset? DeletedAtUtc { get; }
}
