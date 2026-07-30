using Coffeshop.Domain.Identity.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Identity.ValueObjects;

public sealed class FullName : ValueObject
{
    public string Value { get; }

    private FullName(string value)
    {
        Value = value;
    }

    public static FullName Create(string value)
    {
        var trimmed = value?.Trim() ?? string.Empty;

        if (trimmed.Length is 0 or > 200)
        {
            throw new InvalidFullNameException("Full name must be between 1 and 200 characters.");
        }

        return new FullName(trimmed);
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;
}
