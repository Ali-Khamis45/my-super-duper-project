namespace Coffeshop.SharedKernel;

/// <summary>
/// Base type for every domain invariant violation. Concrete subclasses live in
/// Coffeshop.Domain (thrown by aggregates) — the API layer's global exception handler maps
/// specific subclasses to specific HTTP status codes and RFC 9457 <c>type</c> values, per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's exception-handling rules. Never thrown or
/// caught as the base type directly.
/// </summary>
public abstract class DomainException : Exception
{
    protected DomainException(string message)
        : base(message)
    {
    }
}
