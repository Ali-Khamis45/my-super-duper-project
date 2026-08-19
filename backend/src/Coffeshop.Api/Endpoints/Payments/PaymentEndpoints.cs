using Coffeshop.Api.RateLimiting;
using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Payments.Commands;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Application.Payments.Queries;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Payments;
using MediatR;

namespace Coffeshop.Api.Endpoints.Payments;

/// <summary>
/// Per this sprint's own Phase 5 brief. <c>/payments/create-session</c>/<c>/confirm</c>/<c>/cancel</c>
/// are <c>AllowAnonymous</c> (matching <c>POST /orders</c>'s own precedent — a guest checkout has
/// no account to authenticate as) but rate-limited by IP via <see cref="RateLimitingExtensions.PaymentPolicy"/>.
/// <c>/webhook</c> is <c>AllowAnonymous</c> and deliberately unrate-limited — its real gate is
/// signature verification (<see cref="IPaymentGateway.TryParseWebhook"/>), not a request-volume
/// ceiling; see docs/36_SECURITY_MODEL.md's own Sprint 5.5 note. No separate <c>StartPayment</c>
/// endpoint exists — see <c>CreateCheckoutSessionCommand</c>'s own doc comment for why that's the
/// same real command.
/// </summary>
public static class PaymentEndpoints
{
    public static IEndpointRouteBuilder MapPaymentEndpoints(this IEndpointRouteBuilder app)
    {
        var payments = app.MapGroup("/api/v1/payments").WithTags("Payments");

        payments.MapPost("/create-session", CreateCheckoutSession).AllowAnonymous().RequireRateLimiting(RateLimitingExtensions.PaymentPolicy)
            .WithSummary("Start or retry a checkout payment for a submitted order (idempotent)");
        payments.MapPost("/{id:guid}/confirm", ConfirmPayment).AllowAnonymous().RequireRateLimiting(RateLimitingExtensions.PaymentPolicy)
            .WithSummary("Confirm a payment after client-side gateway confirmation");
        payments.MapPost("/{id:guid}/cancel", CancelPayment).AllowAnonymous().RequireRateLimiting(RateLimitingExtensions.PaymentPolicy)
            .WithSummary("Abandon a pending/processing payment and fail its order");
        payments.MapPost("/webhook", ProcessWebhook).AllowAnonymous()
            .WithSummary("Receive a signed payment provider webhook delivery");
        payments.MapGet("/{id:guid}", GetPayment).AllowAnonymous()
            .WithSummary("Get a payment by id");
        payments.MapGet("/{id:guid}/receipt", GetReceipt).AllowAnonymous()
            .WithSummary("Get a receipt for a succeeded/refunded payment");
        payments.MapGet("/history", ListMyPayments).RequireAuthorization()
            .WithSummary("List the current customer's own payments");

        payments.MapPost("/{id:guid}/capture", CapturePayment).RequireAuthorization(PermissionCodes.ProcessRefunds)
            .WithSummary("Capture an authorized (two-phase) payment attempt");
        payments.MapPost("/{id:guid}/refund", RefundPayment).RequireAuthorization(PermissionCodes.ProcessRefunds)
            .WithSummary("Refund a succeeded payment, fully or partially");

        var adminPayments = app.MapGroup("/api/v1/admin/payments").WithTags("Payments").RequireAuthorization(PermissionCodes.ViewPayments);
        adminPayments.MapGet("/", AdminSearchPayments)
            .WithSummary("Search/filter payments across all customers");

        return app;
    }

    private static async Task<IResult> CreateCheckoutSession(CreateCheckoutSessionRequest request, ISender sender, CancellationToken ct)
    {
        var session = await sender.Send(new CreateCheckoutSessionCommand(request.OrderId), ct);
        return Results.Ok(session);
    }

    private static async Task<IResult> ConfirmPayment(Guid id, ISender sender, CancellationToken ct)
    {
        var payment = await sender.Send(new ConfirmPaymentCommand(id), ct);
        return Results.Ok(payment);
    }

    private static async Task<IResult> CapturePayment(Guid id, ISender sender, CancellationToken ct)
    {
        var payment = await sender.Send(new CapturePaymentCommand(id), ct);
        return Results.Ok(payment);
    }

    private static async Task<IResult> CancelPayment(Guid id, CancelPaymentRequest request, ISender sender, CancellationToken ct)
    {
        var payment = await sender.Send(new CancelPaymentCommand(id, request.Reason), ct);
        return Results.Ok(payment);
    }

    private static async Task<IResult> RefundPayment(Guid id, RefundPaymentRequest request, ISender sender, CancellationToken ct)
    {
        var payment = await sender.Send(new RefundPaymentCommand(id, request.Amount, request.Reason), ct);
        return Results.Ok(payment);
    }

    /// <summary>
    /// Reads the raw request body itself, never model-bound JSON — a real gateway's own
    /// signature (Stripe's HMAC-SHA256 <c>Stripe-Signature</c> header) is computed over the
    /// *exact byte sequence* it sent; re-serializing a deserialized/re-bound object would almost
    /// certainly produce a byte-for-byte different payload and fail verification even for a
    /// genuine, unmodified delivery.
    /// </summary>
    private static async Task<IResult> ProcessWebhook(HttpRequest request, ISender sender, CancellationToken ct)
    {
        using var reader = new StreamReader(request.Body);
        var payload = await reader.ReadToEndAsync(ct);
        var signature = request.Headers["Stripe-Signature"].ToString();

        await sender.Send(new ProcessPaymentWebhookCommand(payload, signature), ct);
        return Results.Ok();
    }

    private static async Task<IResult> GetPayment(Guid id, ISender sender, CancellationToken ct)
    {
        var payment = await sender.Send(new GetPaymentQuery(id), ct);
        return Results.Ok(payment);
    }

    private static async Task<IResult> GetReceipt(Guid id, ISender sender, CancellationToken ct)
    {
        var receipt = await sender.Send(new GetPaymentReceiptQuery(id), ct);
        return Results.Ok(receipt);
    }

    private static async Task<IResult> ListMyPayments(ISender sender, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var result = await sender.Send(new ListPaymentsQuery(new PageRequest(page, pageSize)), ct);
        return Results.Ok(result);
    }

    private static async Task<IResult> AdminSearchPayments(ISender sender, string? status, Guid? orderId, string? search, int page = 1, int pageSize = 20, CancellationToken ct = default)
    {
        var filter = new PaymentFilter(status is null ? null : Enum.Parse<PaymentStatus>(status.Replace("-", string.Empty), true), OrderId: orderId, Search: search);
        var result = await sender.Send(new AdminPaymentSearchQuery(filter, new PageRequest(page, pageSize)), ct);
        return Results.Ok(result);
    }
}
