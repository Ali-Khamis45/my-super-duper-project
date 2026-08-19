using Coffeshop.Domain.Payments.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Payments.ValueObjects;

/// <summary>
/// A real, validated value object here — unlike <c>Coffeshop.Domain.Ordering.Order.IdempotencyKey</c>,
/// which stays a plain nullable <c>string</c> (Order's own need is simple existence-checking, no
/// real behavior to encapsulate). Payments needs more: the same key is threaded through to
/// <c>IPaymentGateway.CreateIntentAsync</c> as the gateway's own native idempotency key (Stripe's
/// real <c>Idempotency-Key</c> header) and is the primary lookup key into the real
/// <c>IIdempotencyStore</c> (Phase 3) — real enough behavior to earn a real type, per this
/// sprint's own Phase 1 brief explicitly naming it as a distinct concept.
/// </summary>
public sealed class IdempotencyKey : ValueObject
{
    public const int MaxLength = 200;

    public string Value { get; }

    private IdempotencyKey(string value)
    {
        Value = value;
    }

    public static IdempotencyKey Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidIdempotencyKeyException("An idempotency key cannot be blank.");
        }

        if (value.Length > MaxLength)
        {
            throw new InvalidIdempotencyKeyException($"An idempotency key cannot exceed {MaxLength} characters.");
        }

        return new IdempotencyKey(value.Trim());
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;
}
