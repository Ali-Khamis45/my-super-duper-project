using Coffeshop.Domain.Catalog.ValueObjects;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Ordering.ValueObjects;

/// <summary>
/// The whole-order rollup — recomputed by <see cref="Order"/> itself every time its line items
/// change (<c>AddItem</c>/<c>RemoveItem</c>/<c>UpdateQuantity</c>), never set independently by a
/// caller. <c>Total</c> equals <c>Subtotal</c> today: no tax calculation, delivery fee, or
/// discount/coupon system exists anywhere in this project yet (Coupon is Sprint 5.x-future per
/// docs/30_COMMERCE_DDD_MODEL.md's Promotions context), so a real <c>Tax</c>/<c>Discount</c>
/// field here would have nothing real to compute it from — <c>Total</c> stays a distinct field
/// from <c>Subtotal</c> anyway, so a real tax/discount capability is additive (a new component
/// folded into how <c>Total</c> is computed) rather than a breaking shape change later.
/// </summary>
public sealed class OrderTotals : ValueObject
{
    public Money Subtotal { get; private set; } = null!;

    public Money Total { get; private set; } = null!;

    // Parameterless + private setters, not a (Money, Money) constructor — EF Core can't
    // constructor-bind an owned type whose constructor takes other owned types (the exact
    // `Price`/`Money`/`Money` lesson from Sprint 5.2, caught again here at migration-generation
    // time rather than rediscovered from scratch).
    private OrderTotals()
    {
    }

    public static OrderTotals FromLineTotals(IEnumerable<Money> lineTotals)
    {
        var subtotal = lineTotals.Aggregate(Money.Zero(), (sum, lineTotal) => sum + lineTotal);

        // EF Core's owned-type change tracking keys dependents by CLR reference identity, not
        // by ValueObject equality — sharing one Money instance between Subtotal and Total (both
        // equal in value, since there's no tax/discount yet) makes EF's NavigationFixer conflate
        // the two sibling owned entries and throw ("belongs to type OrderTotals.Total#Money, but
        // is being used with an instance of type OrderTotals.Subtotal#Money") the moment the
        // aggregate is attached. Two distinct instances, same value, sidesteps it.
        var total = Money.Create(subtotal.Amount, subtotal.Currency);
        return new OrderTotals { Subtotal = subtotal, Total = total };
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Subtotal;
        yield return Total;
    }
}
