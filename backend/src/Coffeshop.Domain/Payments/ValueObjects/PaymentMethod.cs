using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Payments.ValueObjects;

/// <summary>
/// Display-only metadata a gateway returns *after* it has already tokenized a card
/// client-side — never raw card data, per docs/36_SECURITY_MODEL.md's PCI threat-table row
/// ("Backend never touches raw card data — provider client SDKs only"). <see cref="Last4"/> is
/// the last four digits only (what every real receipt/statement already shows publicly), never
/// a PAN. This type exists purely so an admin/receipt view can show "Visa ending in 4242"
/// instead of an opaque provider reference.
/// </summary>
public sealed class PaymentMethod : ValueObject
{
    public string Type { get; }

    public string? Brand { get; }

    public string? Last4 { get; }

    private PaymentMethod(string type, string? brand, string? last4)
    {
        Type = type;
        Brand = brand;
        Last4 = last4;
    }

    public static PaymentMethod Create(string type, string? brand, string? last4) => new(type, brand, last4);

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Type;
        yield return Brand;
        yield return Last4;
    }

    public override string ToString() => Brand is not null && Last4 is not null ? $"{Brand} ending in {Last4}" : Type;
}
