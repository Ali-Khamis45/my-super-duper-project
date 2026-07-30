namespace Coffeshop.Domain.Ordering;

/// <summary>
/// A real simplification from Milestone 5 Phase 0's original sketch (<c>Pending → Paid →
/// Preparing → Ready → Completed</c>, docs/30_COMMERCE_DDD_MODEL.md's frozen Ordering table) —
/// this sprint's actual brief names exactly these six transitions (<c>Create/Submit/Cancel/
/// MarkPaid/MarkCompleted/Fail</c>), with no <c>StartPreparing</c>/<c>MarkReady</c> method
/// anywhere in it. <see cref="Ordering.OrderTimeline"/> still carries a real, append-only,
/// human-readable log of what happened and when — including a free-text note — so an admin can
/// record "preparing" / "ready for pickup" progress there without it being a second, separate
/// state machine this enum has to also model. Documentation follows implementation, per this
/// sprint's own explicit instruction: the frozen sketch's finer-grained states are not
/// implemented, and this doc records why, rather than silently diverging from it.
/// </summary>
public enum OrderStatus
{
    /// <summary>Being built — items can still be added/removed/requantified. Never visible to anyone but the customer/cart that owns it.</summary>
    Draft,
    Submitted,
    Paid,
    Completed,
    Cancelled,
    Failed,
}

/// <summary>
/// Deliberately a single member today — this is a coffee shop with a real, existing checkout
/// flow (`CheckoutExperience.tsx`) that has never had a delivery-address field, and no "ship an
/// order" concept exists anywhere in this project's history. The brief names both
/// <c>ShippingMethod</c> and <c>PickupMethod</c>; only <c>Pickup</c> maps to anything real, so
/// only <c>Pickup</c> is implemented — the same "deliberately a single member today" precedent
/// <c>Coffeshop.Domain.Catalog.ProductType</c> already established for the identical reason
/// (real current scope, not speculative future variety). A real delivery/shipping capability,
/// if this business ever adds one, is a new enum member plus a real frontend address form —
/// additive, not a rewrite of this type.
/// </summary>
public enum FulfillmentMethod
{
    Pickup,
}
