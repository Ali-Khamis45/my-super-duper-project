using Coffeshop.Domain.Ordering.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Ordering.ValueObjects;

/// <summary>
/// A real, human-readable order identifier (<c>"CS-100042"</c>) — never the raw <c>Guid</c>
/// primary key, which is what an order confirmation screen/receipt/"my orders" list should
/// show. The numeric part comes from a real PostgreSQL <c>SEQUENCE</c> (`order_number_seq`,
/// configured in Persistence), not an application-level counter — a sequence is atomic under
/// concurrent inserts by construction, the same reason this project already reaches for native
/// Postgres features (arrays, <c>tsvector</c>, <c>xmin</c>) over hand-rolled equivalents.
/// </summary>
public sealed class OrderNumber : ValueObject
{
    private const string Prefix = "CS-";

    public string Value { get; }

    private OrderNumber(string value)
    {
        Value = value;
    }

    /// <summary>The only real constructor path — called once, from Persistence, with the value the database sequence just produced. Never called with an application-guessed number.</summary>
    public static OrderNumber FromSequenceValue(long sequenceValue)
    {
        if (sequenceValue <= 0)
        {
            throw new InvalidOrderNumberException("An order number must come from a real, positive sequence value.");
        }

        return new OrderNumber($"{Prefix}{sequenceValue:000000}");
    }

    /// <summary>Round-trips a value already read back from storage (`"CS-000042"` → the same VO) — never re-derives or re-validates the sequence, since by definition it already came from one.</summary>
    public static OrderNumber Parse(string value)
    {
        if (string.IsNullOrWhiteSpace(value) || !value.StartsWith(Prefix, StringComparison.Ordinal))
        {
            throw new InvalidOrderNumberException($"'{value}' is not a real order number.");
        }

        return new OrderNumber(value);
    }

    /// <summary>Non-throwing variant for untrusted input — `GetOrdersQuery`'s admin search box, where "what staff typed" isn't guaranteed to be a real order number at all (a guest name search is just as likely).</summary>
    public static bool TryParse(string? value, out OrderNumber? orderNumber)
    {
        if (!string.IsNullOrWhiteSpace(value) && value.StartsWith(Prefix, StringComparison.OrdinalIgnoreCase))
        {
            orderNumber = new OrderNumber(value.ToUpperInvariant());
            return true;
        }

        orderNumber = null;
        return false;
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;
}
