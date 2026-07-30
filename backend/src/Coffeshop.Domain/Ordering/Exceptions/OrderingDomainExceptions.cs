using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Ordering.Exceptions;

public sealed class InvalidOrderNumberException(string message) : DomainException(message);

public sealed class InvalidGuestOrderInfoException(string message) : DomainException(message);

public sealed class InvalidRecipeSelectionException(string message) : DomainException(message);

/// <summary>Thrown by <see cref="Order.Create"/> when neither or both of <c>CustomerId</c>/<c>GuestInfo</c> are supplied — an order has exactly one identity path, per docs/29_COMMERCE_ARCHITECTURE_FREEZE.md scenario 2.</summary>
public sealed class InvalidOrderIdentityException(string message) : DomainException(message);

public sealed class OrderNotFoundException()
    : DomainException("This order was not found.");

/// <summary>Thrown by <c>AddItem</c>/<c>RemoveItem</c>/<c>UpdateQuantity</c>/<c>Submit</c> once an order has left <see cref="OrderStatus.Draft"/> — an order is only editable while being built.</summary>
public sealed class OrderNotEditableException()
    : DomainException("This order can no longer be modified — it has already been submitted.");

public sealed class EmptyOrderException()
    : DomainException("An order needs at least one item before it can be submitted.");

public sealed class InvalidOrderStatusTransitionException(string message) : DomainException(message);

public sealed class OrderItemNotFoundException()
    : DomainException("This order item was not found.");
