using Coffeshop.SharedKernel;

// ReSharper disable once CheckNamespace -- doc-comment crefs below reference sibling types in
// Coffeshop.Domain.Inventory; this using resolves them without fully qualifying every one.
using Coffeshop.Domain.Inventory;

namespace Coffeshop.Domain.Inventory.Exceptions;

public sealed class InvalidQuantityException(string message) : DomainException(message);

public sealed class NegativeStockException(string message) : DomainException(message);

public sealed class InvalidLowStockPolicyException(string message) : DomainException(message);

public sealed class InventoryItemNotFoundException()
    : DomainException("No inventory is tracked for this ingredient.");

/// <summary>Thrown by <see cref="InventoryItem.Reserve"/> when the requested quantity exceeds what's actually available (on-hand minus already-reserved) — the real "fail gracefully" behavior this sprint's own brief asks order submission to have.</summary>
public sealed class InsufficientStockException(string message) : DomainException(message);

public sealed class InventoryReservationNotFoundException()
    : DomainException("This inventory reservation was not found.");

/// <summary>Thrown by an <c>InventoryReservation</c>'s own transition methods (<c>Consume</c>/<c>Release</c>/<c>Expire</c>) when called from a status other than <c>Active</c> — a reservation's lifecycle only ever moves forward, once, per docs/30_COMMERCE_DDD_MODEL.md's own "invariants enforced by the aggregate, never a caller" rule.</summary>
public sealed class InvalidReservationStatusException(string message) : DomainException(message);

public sealed class InventoryItemAlreadyExistsException()
    : DomainException("An inventory item already exists for this ingredient.");
