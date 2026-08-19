using Coffeshop.SharedKernel;

// Doc-comment crefs below reference sibling types in Coffeshop.Domain.Payments; this using
// resolves them without fully qualifying every one (matches Inventory's own precedent for the
// identical child-namespace cref-resolution issue).
using Coffeshop.Domain.Payments;

namespace Coffeshop.Domain.Payments.Exceptions;

public sealed class InvalidIdempotencyKeyException(string message) : DomainException(message);

public sealed class InvalidPaymentProviderReferenceException(string message) : DomainException(message);

public sealed class PaymentNotFoundException()
    : DomainException("This payment was not found.");

public sealed class PaymentAttemptNotFoundException()
    : DomainException("This payment attempt was not found.");

/// <summary>Thrown by <see cref="Payment"/>'s own transition methods when called from a status that doesn't allow it — e.g. capturing an attempt twice, or starting a new attempt against an already-<c>Succeeded</c> payment. The real invariant docs/30_COMMERCE_DDD_MODEL.md's frozen Payments sketch names explicitly: "a second capture attempt against an already-captured Payment is a no-op, not a double charge" — enforced here, at the aggregate, never left to a caller to remember.</summary>
public sealed class InvalidPaymentStatusException(string message) : DomainException(message);

/// <summary>Thrown by <see cref="Payment.Refund"/> when the requested amount exceeds what's actually left to refund — <c>Money.Subtract</c> alone can't protect this invariant (it clamps at zero rather than throwing), so the aggregate checks explicitly before ever calling the gateway.</summary>
public sealed class InvalidRefundAmountException(string message) : DomainException(message);

public sealed class PaymentAlreadyExistsException()
    : DomainException("A payment already exists for this order.");

/// <summary>Thrown by <c>ProcessPaymentWebhookCommandHandler</c> when <c>IPaymentGateway.TryParseWebhook</c> returns <c>null</c> — a bad/missing/forged signature. Deliberately still a real, typed exception (mapped to a real <c>400</c>, per docs/36_SECURITY_MODEL.md), even though nothing raises a domain event for it — see docs/32_COMMERCE_EVENT_CATALOG.md's own Sprint 5.5 note on why <c>payment:webhook-invalid</c> is a logged/audited signal, not an outbox event.</summary>
public sealed class InvalidWebhookSignatureException()
    : DomainException("The webhook signature could not be verified.");

/// <summary>Thrown by <c>PayOrderCommandHandler</c> when a real gateway <see cref="Payment"/> is already <see cref="PaymentStatus.Pending"/>/<see cref="PaymentStatus.Processing"/> against the same order — see that command's own doc comment for the real double-charge this prevents.</summary>
public sealed class PaymentInProgressException()
    : DomainException("This order has a payment already in progress. Cancel it before recording payment by another means.");
