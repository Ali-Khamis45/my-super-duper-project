namespace Coffeshop.SharedKernel;

/// <summary>
/// Audit fields shared by every aggregate root, per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's
/// entity rules — populated exclusively by the SaveChanges interceptor
/// (Coffeshop.Persistence.Interceptors.AuditableEntityInterceptor), never set by a handler.
/// </summary>
public abstract class AuditableEntity<TId> : AggregateRoot<TId>, ISoftDelete
    where TId : notnull
{
    protected AuditableEntity()
    {
    }

    protected AuditableEntity(TId id)
        : base(id)
    {
    }

    public DateTimeOffset CreatedAtUtc { get; internal set; }

    public string? CreatedBy { get; internal set; }

    public DateTimeOffset? ModifiedAtUtc { get; internal set; }

    public string? ModifiedBy { get; internal set; }

    public bool IsDeleted { get; internal set; }

    public DateTimeOffset? DeletedAtUtc { get; internal set; }

    /// <summary>
    /// Concurrency token backed by PostgreSQL's own <c>xmin</c> system column
    /// (configured in Persistence, never a hand-rolled counter) — surfaced to the API as an
    /// ETag per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md's REST conventions.
    /// </summary>
    public uint RowVersion { get; internal set; }
}
