using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Catalog.ValueObjects;

/// <summary>
/// Per docs/30_COMMERCE_DDD_MODEL.md's Catalog value objects — arithmetic operators defined
/// once, used everywhere money is touched, the backend's equivalent of never hand-rolling a
/// second color-conversion function. USD only today (no real multi-currency requirement
/// exists yet); <see cref="Currency"/> is a real field, not a hardcoded constant, so adding a
/// second currency later is additive, not a schema change.
/// </summary>
public sealed class Money : ValueObject
{
    public decimal Amount { get; }

    public string Currency { get; }

    private Money(decimal amount, string currency)
    {
        Amount = amount;
        Currency = currency;
    }

    public static Money Create(decimal amount, string currency = "USD")
    {
        if (amount < 0)
        {
            throw new InvalidMoneyException("Money cannot be negative.");
        }

        if (string.IsNullOrWhiteSpace(currency) || currency.Length != 3)
        {
            throw new InvalidMoneyException("Currency must be a 3-letter ISO code.");
        }

        return new Money(decimal.Round(amount, 2), currency.ToUpperInvariant());
    }

    public static Money Zero(string currency = "USD") => Create(0m, currency);

    public Money Add(Money other)
    {
        RequireSameCurrency(other);
        return Create(Amount + other.Amount, Currency);
    }

    public Money Subtract(Money other)
    {
        RequireSameCurrency(other);
        return Create(Math.Max(0, Amount - other.Amount), Currency);
    }

    public static Money operator +(Money left, Money right) => left.Add(right);

    public static Money operator -(Money left, Money right) => left.Subtract(right);

    public static bool operator >(Money left, Money right)
    {
        left.RequireSameCurrency(right);
        return left.Amount > right.Amount;
    }

    public static bool operator <(Money left, Money right)
    {
        left.RequireSameCurrency(right);
        return left.Amount < right.Amount;
    }

    private void RequireSameCurrency(Money other)
    {
        if (Currency != other.Currency)
        {
            throw new InvalidMoneyException($"Cannot combine {Currency} with {other.Currency}.");
        }
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Amount;
        yield return Currency;
    }

    public override string ToString() => $"{Amount:0.00} {Currency}";
}
