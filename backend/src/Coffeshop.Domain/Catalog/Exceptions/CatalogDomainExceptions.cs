using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Catalog.Exceptions;

public sealed class InvalidMoneyException(string message) : DomainException(message);

public sealed class InvalidPriceException(string message) : DomainException(message);

public sealed class InvalidSkuException(string message) : DomainException(message);

public sealed class InvalidProductTagException(string message) : DomainException(message);

public sealed class SkuAlreadyExistsException()
    : DomainException("A product with this SKU already exists.");

public sealed class CategoryAlreadyExistsException(string code)
    : DomainException($"A category with code '{code}' already exists.");

public sealed class CategoryNotFoundException()
    : DomainException("This category was not found.");

public sealed class IngredientAlreadyExistsException(string code)
    : DomainException($"An ingredient with code '{code}' already exists.");

public sealed class IngredientNotFoundException()
    : DomainException("This ingredient was not found.");

/// <summary>
/// Additive (Sprint 5.2, Phase 10 review) — a real gap found reviewing `CreateIngredientCommand`:
/// unlike `CreateProductCommand`'s `CategoryNotFoundException` guard for `CategoryCode`, nothing
/// previously validated that `IngredientCategoryId` refers to a real <see cref="IngredientCategory"/>
/// before creating the <see cref="Ingredient"/> — and there is no database foreign key either
/// (<c>IngredientCategory</c> is a lightweight reference entity with no navigation configured),
/// so a bogus id would have silently succeeded and produced an ingredient with a dangling
/// reference, surfacing later as an empty `Category` string on every read.
/// </summary>
public sealed class IngredientCategoryNotFoundException()
    : DomainException("This ingredient category was not found.");

public sealed class ProductNotFoundException()
    : DomainException("This product was not found.");

/// <summary>Thrown when a mutation targets a product that's already `Archived` — archived products are immutable except for `Restore`, per this context's own invariant.</summary>
public sealed class ProductArchivedException()
    : DomainException("This product is archived and cannot be modified. Restore it first.");

/// <summary>
/// Additive (Sprint 5.3) — thrown by <c>CreateOrderFromCartCommand</c> when a cart line
/// references a real, existing product that isn't currently orderable (not `Published`, or
/// `IsAvailable == false`). Distinct from <see cref="ProductNotFoundException"/>: the product
/// genuinely exists (a stale client-side cart snapshot referencing it isn't nonsense), it's just
/// not something the backend will let anyone actually order right now — the real "never trust
/// client pricing/availability" check this sprint's own brief names explicitly.
/// </summary>
public sealed class ProductNotAvailableException()
    : DomainException("This product is no longer available to order.");

public sealed class InvalidIngredientCompatibilityException(string message) : DomainException(message);

public sealed class InvalidProductStatusTransitionException(string message) : DomainException(message);
