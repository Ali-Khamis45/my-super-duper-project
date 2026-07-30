using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Catalog.ValueObjects;

/// <summary>A freeform, normalized (lowercase, trimmed) tag — matches the frontend `Drink.tags: string[]` shape field-for-field.</summary>
public sealed class ProductTag : ValueObject
{
    public string Value { get; }

    private ProductTag(string value)
    {
        Value = value;
    }

    public static ProductTag Create(string value)
    {
        var normalized = value?.Trim().ToLowerInvariant() ?? string.Empty;

        if (normalized.Length is 0 or > 40)
        {
            throw new InvalidProductTagException("A product tag must be between 1 and 40 characters.");
        }

        return new ProductTag(normalized);
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;
}
