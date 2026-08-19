namespace Coffeshop.Application.Payments.Interfaces;

/// <summary>
/// A real, durable dedup mechanism — distinct from <c>Payment.IdempotencyKey</c> (which dedups a
/// *checkout attempt*, resolved by <c>IPaymentRepository.GetByIdempotencyKeyAsync</c>). This
/// store's real, first need is webhook delivery: gateways explicitly document and expect
/// at-least-once delivery (Stripe retries a webhook until it gets a 2xx), so the same event id
/// can arrive more than once — <see cref="TryReserveAsync"/> is what makes replaying the same
/// webhook event a safe no-op instead of a second capture/refund. Keyed by the gateway's own
/// event id (e.g. Stripe's <c>evt_...</c>), never <c>Payment.IdempotencyKey</c> — two different
/// keys for two different kinds of duplication.
/// </summary>
public interface IIdempotencyStore
{
    /// <summary>Atomically records <paramref name="key"/> as seen — returns <c>true</c> the first time a given key is reserved (the caller should proceed), <c>false</c> on every subsequent call with the same key (the caller must treat this as an already-handled duplicate and skip real work).</summary>
    Task<bool> TryReserveAsync(string key, CancellationToken ct);
}
