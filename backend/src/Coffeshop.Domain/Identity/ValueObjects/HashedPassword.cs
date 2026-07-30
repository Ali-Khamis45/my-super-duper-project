using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Identity.ValueObjects;

/// <summary>
/// Wraps an already-hashed password. Never constructible from a plaintext string — the only
/// factory is <see cref="FromHash"/>, called exclusively by Coffeshop.Identity's
/// <c>IPasswordHasher</c> implementation (<c>PasswordHasher&lt;User&gt;</c>), so a raw
/// password can never accidentally end up persisted or logged as if it were this type.
/// </summary>
public sealed class HashedPassword : ValueObject
{
    public string Value { get; }

    private HashedPassword(string value)
    {
        Value = value;
    }

    public static HashedPassword FromHash(string hash)
    {
        if (string.IsNullOrWhiteSpace(hash))
        {
            throw new ArgumentException("A password hash cannot be empty.", nameof(hash));
        }

        return new HashedPassword(hash);
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Value;
    }

    public override string ToString() => "[redacted]";
}
