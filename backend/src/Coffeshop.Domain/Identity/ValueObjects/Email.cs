using System.Text.RegularExpressions;
using Coffeshop.Domain.Identity.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Identity.ValueObjects;

/// <summary>
/// A validated, normalized (lowercase) email address. Per docs/30_COMMERCE_DDD_MODEL.md's
/// Identity value objects. Never constructible in an invalid state.
/// </summary>
public sealed partial class Email : ValueObject
{
    public string Value { get; }

    private Email(string value)
    {
        Value = value;
    }

    public static Email Create(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new InvalidEmailException("Email cannot be empty.");
        }

        var normalized = value.Trim().ToLowerInvariant();

        if (normalized.Length > 256 || !EmailPattern().IsMatch(normalized))
        {
            throw new InvalidEmailException($"'{value}' is not a valid email address.");
        }

        return new Email(normalized);
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;

    [GeneratedRegex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$")]
    private static partial Regex EmailPattern();
}
