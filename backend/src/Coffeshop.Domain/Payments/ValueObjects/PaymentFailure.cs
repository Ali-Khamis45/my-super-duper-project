using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Payments.ValueObjects;

/// <summary>
/// Structured failure detail — mirrors the real shape every gateway actually returns (Stripe's
/// own error object: <c>type</c>/<c>code</c>/<c>decline_code</c>/<c>message</c>), not a plain
/// string. Gives a retry UI something real to branch on (e.g. <c>DeclineCode == "insufficient_funds"</c>
/// vs. <c>"expired_card"</c> warrant different customer-facing copy) instead of pattern-matching
/// a human-readable sentence. <see cref="Message"/> is always safe to show a customer directly —
/// gateways design their own decline messages to be customer-facing already; this type never
/// carries raw exception text/stack traces (that stays server-side logging only, per
/// docs/36_SECURITY_MODEL.md's "no secret/internal detail leaked to a response body" rule).
/// </summary>
public sealed class PaymentFailure : ValueObject
{
    public string Code { get; }

    public string Message { get; }

    public string? DeclineCode { get; }

    private PaymentFailure(string code, string message, string? declineCode)
    {
        Code = code;
        Message = message;
        DeclineCode = declineCode;
    }

    public static PaymentFailure Create(string code, string message, string? declineCode = null) => new(code, message, declineCode);

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Code;
        yield return Message;
        yield return DeclineCode;
    }

    public override string ToString() => Message;
}
