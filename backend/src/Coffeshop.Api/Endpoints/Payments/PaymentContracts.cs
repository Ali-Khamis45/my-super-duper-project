namespace Coffeshop.Api.Endpoints.Payments;

public sealed record CreateCheckoutSessionRequest(Guid OrderId);

public sealed record CancelPaymentRequest(string? Reason);

public sealed record RefundPaymentRequest(decimal? Amount, string? Reason);
