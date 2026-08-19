using Coffeshop.Application.Payments.Commands;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Domain.Payments.Exceptions;
using Coffeshop.Infrastructure.Payments;
using MediatR;

namespace Coffeshop.Api.Endpoints.Payments;

public sealed record SimulateWebhookRequest(string EventType);

/// <summary>
/// Development-only — mapped only when <c>app.Environment.IsDevelopment()</c> (see
/// <c>Program.cs</c>'s own registration call), never reachable in a real deployment. Exists
/// specifically because no real Stripe account exists in this environment (see this sprint's
/// own review for the full disclosure): this is how "webhook replay," "duplicate webhook
/// handling," and the full receive-verify-correlate-capture pipeline get real, live verification
/// against <see cref="FakePaymentGateway"/>'s own real signature scheme, exercising the *exact
/// same* <see cref="ProcessPaymentWebhookCommand"/> a genuine Stripe delivery would — not a
/// second, parallel test-only code path.
/// </summary>
public static class DevPaymentWebhookEndpoints
{
    public static IEndpointRouteBuilder MapDevPaymentWebhookEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapPost("/api/v1/dev/payments/{paymentId:guid}/simulate-webhook", SimulateWebhook)
            .WithTags("Payments (dev)")
            .AllowAnonymous()
            .WithSummary("Dev-only: build a real signed FakeGateway webhook and deliver it through the real pipeline");

        return app;
    }

    private static async Task<IResult> SimulateWebhook(Guid paymentId, SimulateWebhookRequest request, IPaymentRepository paymentRepository, IPaymentGateway gateway, ISender sender, CancellationToken ct)
    {
        if (gateway is not FakePaymentGateway fakeGateway)
        {
            return Results.Problem("Webhook simulation is only available when Payments:Provider is \"Fake\".", statusCode: StatusCodes.Status400BadRequest);
        }

        var payment = await paymentRepository.GetByIdAsync(paymentId, ct) ?? throw new PaymentNotFoundException();
        var reference = payment.CurrentAttempt?.ProviderReference?.Value ?? throw new PaymentAttemptNotFoundException();

        var (payload, signatureHeader) = fakeGateway.BuildWebhook(reference, request.EventType);
        await sender.Send(new ProcessPaymentWebhookCommand(payload, signatureHeader), ct);

        return Results.Ok();
    }
}
