using Coffeshop.Domain.Identity.Exceptions;
using Coffeshop.Domain.Ordering.Exceptions;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Ordering.ValueObjects;

/// <summary>
/// Named <c>GuestOrderInfo</c> per this sprint's own Phase 1 brief (docs/30_COMMERCE_DDD_MODEL.md's
/// frozen sketch called the equivalent concept <c>GuestContactInfo</c> — the same real thing,
/// this sprint's own naming wins per "implementation follows documentation, documentation
/// follows implementation"). <c>Name</c>/<c>Email</c> only, matching `CheckoutExperience.tsx`'s
/// real, existing form exactly — no phone number, no address, since neither field exists
/// anywhere in the current checkout UI and adding one here would have nothing real to validate
/// against.
/// </summary>
public sealed class GuestOrderInfo : ValueObject
{
    public string Name { get; }

    public string Email { get; }

    private GuestOrderInfo(string name, string email)
    {
        Name = name;
        Email = email;
    }

    public static GuestOrderInfo Create(string name, string email)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new InvalidGuestOrderInfoException("A guest order needs a real name.");
        }

        // Phase 10 fix — a real validation hole this sprint's own adversarial review found: this
        // used to accept anything containing an "@" (e.g. "not-an-email@", "@", "x@x" with no
        // TLD), a much weaker check than Identity's own already-proven `Email` value object,
        // re-derived here instead of reused. `Email.Create`'s `InvalidEmailException` is an
        // Identity-context exception type — caught and re-thrown as Ordering's own
        // `InvalidGuestOrderInfoException` rather than leaking a different bounded context's
        // exception type through this one's own validation surface.
        string normalizedEmail;
        try
        {
            normalizedEmail = Coffeshop.Domain.Identity.ValueObjects.Email.Create(email).Value;
        }
        catch (InvalidEmailException)
        {
            throw new InvalidGuestOrderInfoException("A guest order needs a real email address.");
        }

        return new GuestOrderInfo(name.Trim(), normalizedEmail);
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Name;
        yield return Email;
    }
}
