namespace Coffeshop.SharedKernel;

/// <summary>
/// Marker for something an aggregate raised. Deliberately free of any MediatR/ASP.NET Core
/// dependency — SharedKernel has zero dependencies on anything else in the solution, per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md. The Application layer wraps these in a
/// MediatR-compatible notification at dispatch time, not here.
/// </summary>
public interface IDomainEvent
{
    Guid EventId { get; }

    DateTimeOffset OccurredOnUtc { get; }
}
