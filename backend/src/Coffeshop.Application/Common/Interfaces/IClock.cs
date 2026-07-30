namespace Coffeshop.Application.Common.Interfaces;

/// <summary>
/// The clock abstraction named in the sprint brief's Phase 5 — every "now" in Application code
/// goes through this, never <c>DateTimeOffset.UtcNow</c> directly, so tests can control time
/// (token expiry, session age) deterministically.
/// </summary>
public interface IClock
{
    DateTimeOffset UtcNow { get; }
}
