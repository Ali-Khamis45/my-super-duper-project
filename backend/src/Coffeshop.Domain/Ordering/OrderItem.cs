using Coffeshop.Domain.Catalog.ValueObjects;
using Coffeshop.Domain.Ordering.ValueObjects;
using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Ordering;

/// <summary>
/// An entity inside <see cref="Order"/> — one line item, the immutable-once-created backend
/// counterpart to the frontend's own <c>RecipeSnapshot</c> (`features/cart/types.ts`). Every
/// field here is denormalized at the moment it's added (`ProductName`/`Sku`/`UnitPrice`), the
/// same "what was actually ordered stays true even if the live catalog changes later" invariant
/// `RecipeSnapshot` already established client-side, per docs/30_COMMERCE_DDD_MODEL.md's
/// Ordering invariants. <c>UnitPrice</c> is never the client's own <c>RecipeSnapshot.unitPrice</c>
/// — it is looked up fresh from the real <c>Product</c> (plus each placed ingredient's real
/// <c>PriceModifier</c>) by <c>CreateOrderFromCartCommandHandler</c>, per this sprint's own
/// "never trust client pricing" instruction.
/// </summary>
public sealed class OrderItem : Entity<Guid>
{
    public Guid ProductId { get; private set; }

    public string ProductName { get; private set; } = null!;

    public string Sku { get; private set; } = null!;

    public RecipeSelection Selection { get; private set; } = null!;

    public Money UnitPrice { get; private set; } = null!;

    public int Quantity { get; private set; }

    public Money LineTotal => UnitPrice * Quantity;

    /// <summary>Denormalized from the frontend's <c>RecipeSnapshot.appliedRecommendationId</c> — preserves "was this AI-recommended" per line, the same real signal the frontend already tracks, without a redundant order-level field duplicating it.</summary>
    public string? RecommendationId { get; private set; }

    private OrderItem()
    {
    }

    internal static OrderItem Create(Guid productId, string productName, string sku, RecipeSelection selection, Money unitPrice, int quantity, string? recommendationId) =>
        new()
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            ProductName = productName.Trim(),
            Sku = sku.Trim(),
            Selection = selection,
            UnitPrice = unitPrice,
            Quantity = quantity,
            RecommendationId = recommendationId,
        };

    internal void UpdateQuantity(int quantity) => Quantity = quantity;
}
