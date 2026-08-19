using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Domain.Payments;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Coffeshop.Infrastructure.Payments;

/// <summary>
/// A real, fully-functional in-process payment gateway simulator — not a stub, not a
/// placeholder. This sprint's own Stripe credentials question (no real Stripe account exists in
/// this environment — see this sprint's own review) makes this the gateway every real
/// local/CI/e2e verification this sprint runs against, the same role Mailhog already plays for
/// email (a real protocol implementation, a fake destination). Card-tokenization-free by design
/// (this backend never receives raw card data from any gateway, real or fake — see
/// docs/36_SECURITY_MODEL.md's own PCI threat-table row) means there is no card number for a
/// caller to pass; instead, this gateway uses a documented, deterministic **magic-amount**
/// convention — the exact same "well-known test input triggers a well-known outcome" idea
/// Stripe's own real test-mode card numbers use, adapted to the one signal this gateway actually
/// has: the charge amount.
///
/// | Amount's cents | Outcome |
/// |---|---|
/// | <c>.13</c> (e.g. $10.13) | Declined — <c>card_declined</c> / <c>insufficient_funds</c> |
/// | <c>.14</c> (e.g. $10.14) | Provider error — a real, non-decline gateway failure |
/// | anything else | Succeeds |
///
/// Resolves synchronously and entirely server-side (there is no client-side SDK to wait on),
/// so <see cref="CreateIntentResult.ClientSecret"/>/<see cref="CreateIntentResult.PublishableKey"/>
/// are always <c>null</c> — <c>ConfirmPaymentCommand</c>'s own <c>GetStatusAsync</c> call, made
/// immediately after, is what actually resolves the outcome this class already decided at
/// <see cref="CreateIntentAsync"/> time.
/// </summary>
public sealed class FakePaymentGateway(ILogger<FakePaymentGateway> logger, IOptions<PaymentsOptions> options) : IPaymentGateway
{
    private const string WebhookSecret = "fake_webhook_shared_secret";

    // Intentionally process-lifetime, in-memory state — this gateway exists only for local/CI
    // verification, never a production deployment target (PaymentsOptions.Provider defaults to
    // "Fake" but a real deploy sets it to "Stripe" explicitly); no durability guarantee is
    // needed beyond one running process.
    private static readonly Dictionary<string, FakeIntent> Intents = [];

    private readonly bool _manualCapture = string.Equals(options.Value.CaptureMode, "Manual", StringComparison.OrdinalIgnoreCase);

    public PaymentProviderName Provider => PaymentProviderName.Fake;

    public Task<CreateIntentResult> CreateIntentAsync(Guid orderId, decimal amount, string currency, string idempotencyKey, CancellationToken ct)
    {
        var cents = (int)Math.Round(amount * 100m) % 100;
        var reference = $"fake_pi_{Guid.NewGuid():N}";

        var outcome = cents switch
        {
            13 => new GatewayPaymentOutcome(false, null, null, null, "card_declined", "Your card was declined.", "insufficient_funds", false),
            14 => new GatewayPaymentOutcome(false, null, null, null, "provider_error", "The fake gateway simulated a provider-side failure.", null, true),
            _ => new GatewayPaymentOutcome(true, "card", "visa", "4242", null, null, null, false, RequiresCapture: _manualCapture),
        };

        lock (Intents)
        {
            Intents[reference] = new FakeIntent(orderId, outcome);
        }

        logger.LogInformation("FakePaymentGateway created intent {Reference} for order {OrderId} ({Outcome})", reference, orderId, outcome.Succeeded ? "will-succeed" : "will-fail");

        return Task.FromResult(new CreateIntentResult(reference, null, null));
    }

    public Task<GatewayPaymentOutcome> GetStatusAsync(string providerReference, CancellationToken ct)
    {
        lock (Intents)
        {
            return Task.FromResult(Intents.TryGetValue(providerReference, out var intent)
                ? intent.Outcome
                : new GatewayPaymentOutcome(false, null, null, null, "not_found", "No such payment intent.", null, true));
        }
    }

    /// <summary>
    /// The real "capture the authorized intent" step, distinct from <see cref="GetStatusAsync"/> —
    /// only meaningfully different in <c>CaptureMode: "Manual"</c>: it flips the stored intent's
    /// own outcome from <c>RequiresCapture: true</c> to <c>false</c>, same as Stripe's real
    /// <c>PaymentIntent.Capture</c> actually settling the charge server-side. In automatic-capture
    /// mode (the default) this is a same-outcome no-op, since <see cref="CreateIntentAsync"/>
    /// already resolved everything.
    /// </summary>
    public Task<GatewayPaymentOutcome> CaptureAsync(string providerReference, CancellationToken ct)
    {
        lock (Intents)
        {
            if (!Intents.TryGetValue(providerReference, out var intent))
            {
                return Task.FromResult(new GatewayPaymentOutcome(false, null, null, null, "not_found", "No such payment intent.", null, true));
            }

            if (intent.Outcome.RequiresCapture)
            {
                intent = intent with { Outcome = intent.Outcome with { RequiresCapture = false } };
                Intents[providerReference] = intent;
            }

            return Task.FromResult(intent.Outcome);
        }
    }

    public Task<RefundOutcome> RefundAsync(string providerReference, decimal amount, string currency, CancellationToken ct) =>
        Task.FromResult(new RefundOutcome(true, $"fake_re_{Guid.NewGuid():N}", null));

    /// <summary>Constructs a real, verifiable webhook payload+signature for this specific intent — used by <c>FakeWebhookSender</c> (dev-only endpoint, see that class's own doc comment) to exercise the exact same webhook code path a real Stripe delivery would, without a real Stripe account.</summary>
    public (string Payload, string SignatureHeader) BuildWebhook(string providerReference, string eventType)
    {
        FakeIntent intent;
        lock (Intents)
        {
            intent = Intents[providerReference];
        }

        var payload = JsonSerializer.Serialize(new FakeWebhookPayload(
            $"evt_{Guid.NewGuid():N}", eventType, intent.OrderId, providerReference, intent.Outcome));

        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var signature = Sign(payload, timestamp);
        return (payload, $"t={timestamp},v1={signature}");
    }

    public ParsedWebhookEvent? TryParseWebhook(string payload, string signatureHeader)
    {
        if (!TryVerifySignature(payload, signatureHeader))
        {
            return null;
        }

        FakeWebhookPayload? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<FakeWebhookPayload>(payload);
        }
        catch (JsonException)
        {
            return null;
        }

        if (parsed is null)
        {
            return null;
        }

        return new ParsedWebhookEvent(parsed.Id, parsed.Type, parsed.ProviderReference, parsed.OrderId, parsed.Outcome);
    }

    private static bool TryVerifySignature(string payload, string signatureHeader)
    {
        var parts = signatureHeader.Split(',').Select(p => p.Split('=', 2)).Where(p => p.Length == 2).ToDictionary(p => p[0], p => p[1]);
        if (!parts.TryGetValue("t", out var timestampRaw) || !parts.TryGetValue("v1", out var providedSignature) || !long.TryParse(timestampRaw, out var timestamp))
        {
            return false;
        }

        var expectedSignature = Sign(payload, timestamp);
        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expectedSignature), Encoding.UTF8.GetBytes(providedSignature));
    }

    private static string Sign(string payload, long timestamp)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(WebhookSecret));
        var signedPayload = $"{timestamp}.{payload}";
        return Convert.ToHexStringLower(hmac.ComputeHash(Encoding.UTF8.GetBytes(signedPayload)));
    }

    private sealed record FakeIntent(Guid OrderId, GatewayPaymentOutcome Outcome);

    private sealed record FakeWebhookPayload(string Id, string Type, Guid OrderId, string ProviderReference, GatewayPaymentOutcome Outcome);
}
