using Coffeshop.Domain.Identity.ValueObjects;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Common.ValueObjects;

/// <summary>
/// Email-only contact info for a guest (unauthenticated) checkout, for the order-confirmation
/// notification — per docs/30_COMMERCE_DDD_MODEL.md's Ordering value objects (added during the
/// Phase 0 RC0 audit, docs/40_COMMERCE_RC0_APPROVAL.md, which found it referenced by two docs
/// but never actually frozen in the model). Lives in Domain.Common rather than
/// Domain.Identity/Domain.Ordering because its only consumer (the <c>Order</c> aggregate)
/// doesn't exist until Sprint 5.3 — built now, ready to embed, per the sprint 5.1 brief's
/// explicit request, with no other Ordering scaffolding created ahead of its own sprint.
/// </summary>
public sealed class GuestContactInfo : ValueObject
{
    public Email Email { get; }

    private GuestContactInfo(Email email)
    {
        Email = email;
    }

    public static GuestContactInfo Create(string email) => new(Email.Create(email));

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Email;
    }
}
