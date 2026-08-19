using Coffeshop.Domain.Payments.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Payments.ValueObjects;

/// <summary>
/// Per docs/30_COMMERCE_DDD_MODEL.md's frozen Payments sketch: "the opaque id a gateway gives
/// back — Stripe's `PaymentIntent` id, Paymob's transaction id — stored as a string, never
/// parsed/relied on for shape by domain code." A thin wrapper, not a bare <c>string</c>
/// property, specifically so no future call site is ever tempted to string-split or prefix-check
/// this value to infer which provider it came from — the whole point of <c>IPaymentGateway</c>'s
/// own abstraction is that domain code never needs to know.
/// </summary>
public sealed class PaymentProviderReference : ValueObject
{
    public string Value { get; }

    private PaymentProviderReference(string value)
    {
        Value = value;
    }

    public static PaymentProviderReference Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidPaymentProviderReferenceException("A provider reference cannot be blank.");
        }

        return new PaymentProviderReference(value.Trim());
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;
}
