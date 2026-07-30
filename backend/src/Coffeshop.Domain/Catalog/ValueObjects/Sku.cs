using System.Text.RegularExpressions;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Catalog.ValueObjects;

/// <summary>A stock-keeping unit — uppercase alphanumeric with dashes, e.g. <c>ESP-CLASSIC-001</c>.</summary>
public sealed partial class Sku : ValueObject
{
    public string Value { get; }

    private Sku(string value)
    {
        Value = value;
    }

    public static Sku Create(string value)
    {
        var normalized = value?.Trim().ToUpperInvariant() ?? string.Empty;

        if (normalized.Length is < 3 or > 32 || !SkuPattern().IsMatch(normalized))
        {
            throw new InvalidSkuException($"'{value}' is not a valid SKU (3-32 uppercase alphanumeric characters and dashes).");
        }

        return new Sku(normalized);
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => Value;

    [GeneratedRegex("^[A-Z0-9-]+$")]
    private static partial Regex SkuPattern();
}
