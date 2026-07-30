namespace Coffeshop.Api.Endpoints.Ordering;

public sealed record RecipeIngredientPlacementRequest(string IngredientId, int Quantity);

public sealed record RecipeSelectionRequest(string Color, string Size, string Sleeve, string Lid, string Logo, string Material, IReadOnlyCollection<RecipeIngredientPlacementRequest> Ingredients);

public sealed record CartLineRequest(Guid ProductId, RecipeSelectionRequest Selection, int Quantity, string? RecommendationId);

/// <summary>
/// Deliberately no `CustomerId` field — see `CreateOrderFromCartCommand`'s own doc comment for
/// why that has to come from the authenticated caller's JWT, never a request-body field a
/// client could set to someone else's id. `GuestName`/`GuestEmail` are only read when the
/// caller is anonymous; both are silently ignored for an authenticated request.
/// </summary>
/// <summary>`IdempotencyKey` — additive (Phase 10) — a client-generated key, stable per real checkout attempt; see `Coffeshop.Domain.Ordering.Order.IdempotencyKey`'s own doc comment.</summary>
public sealed record CreateOrderRequest(IReadOnlyCollection<CartLineRequest> Lines, string? GuestName, string? GuestEmail, string FulfillmentMethod, string IdempotencyKey);

public sealed record CancelOrderRequest(string? Reason);

public sealed record FailOrderRequest(string Reason);
