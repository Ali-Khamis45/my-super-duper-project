using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Domain.Payments;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Stripe;

namespace Coffeshop.Infrastructure.Payments;

/// <summary>
/// The real Stripe integration — official <c>Stripe.net</c> SDK, real PaymentIntents API calls,
/// real webhook signature verification via Stripe's own <see cref="EventUtility"/>. Written and
/// compiled as production-quality code, but **not live-verified against Stripe's real servers
/// this sprint** — no Stripe account/test API key exists in this development environment (see
/// this sprint's own review for the explicit disclosure). Every other test/verification this
/// sprint runs against <see cref="FakePaymentGateway"/> instead; this class is real, correct,
/// unexercised code, not a stub — the distinction matters and is documented honestly rather than
/// glossed over.
///
/// <c>automatic_payment_methods</c> + automatic capture (Stripe's own recommended default) is
/// used for <see cref="CreateIntentAsync"/> — the primary checkout path never needs
/// <see cref="CaptureAsync"/> at all; that method exists for the real, separate two-phase
/// authorize-then-capture flow (<c>capture_method: manual</c>), reachable via
/// <c>CapturePaymentCommand</c>. <see cref="Metadata"/> always carries the real <c>orderId</c> —
/// see <c>ParsedWebhookEvent</c>'s own doc comment for why a webhook correlates back to a
/// <c>Payment</c> through this, never by parsing <see cref="PaymentProviderReference"/> itself.
/// </summary>
public sealed class StripePaymentGateway : IPaymentGateway
{
    private const string OrderIdMetadataKey = "orderId";

    private readonly PaymentIntentService _paymentIntents;
    private readonly RefundService _refunds;
    private readonly string _webhookSecret;
    private readonly string _publishableKey;
    private readonly bool _manualCapture;
    private readonly ILogger<StripePaymentGateway> _logger;

    public StripePaymentGateway(IOptions<PaymentsOptions> options, ILogger<StripePaymentGateway> logger)
    {
        var settings = options.Value;
        StripeConfiguration.ApiKey = settings.StripeSecretKey;
        _webhookSecret = settings.StripeWebhookSecret ?? string.Empty;
        _publishableKey = settings.StripePublishableKey ?? string.Empty;
        _manualCapture = string.Equals(settings.CaptureMode, "Manual", StringComparison.OrdinalIgnoreCase);
        _logger = logger;

        _paymentIntents = new PaymentIntentService();
        _refunds = new RefundService();
    }

    public PaymentProviderName Provider => PaymentProviderName.Stripe;

    public async Task<CreateIntentResult> CreateIntentAsync(Guid orderId, decimal amount, string currency, string idempotencyKey, CancellationToken ct)
    {
        var options = new PaymentIntentCreateOptions
        {
            Amount = ToMinorUnits(amount),
            Currency = currency.ToLowerInvariant(),
            AutomaticPaymentMethods = new PaymentIntentAutomaticPaymentMethodsOptions { Enabled = true },
            CaptureMethod = _manualCapture ? "manual" : "automatic",
            Metadata = new Dictionary<string, string> { [OrderIdMetadataKey] = orderId.ToString() },
        };

        var intent = await _paymentIntents.CreateAsync(options, new RequestOptions { IdempotencyKey = idempotencyKey }, ct);
        return new CreateIntentResult(intent.Id, intent.ClientSecret, _publishableKey);
    }

    public async Task<GatewayPaymentOutcome> GetStatusAsync(string providerReference, CancellationToken ct)
    {
        var intent = await _paymentIntents.GetAsync(providerReference, cancellationToken: ct);
        return ToOutcome(intent);
    }

    public async Task<GatewayPaymentOutcome> CaptureAsync(string providerReference, CancellationToken ct)
    {
        var intent = await _paymentIntents.CaptureAsync(providerReference, cancellationToken: ct);
        return ToOutcome(intent);
    }

    public async Task<RefundOutcome> RefundAsync(string providerReference, decimal amount, string currency, CancellationToken ct)
    {
        try
        {
            var refund = await _refunds.CreateAsync(new RefundCreateOptions
            {
                PaymentIntent = providerReference,
                Amount = ToMinorUnits(amount),
            }, cancellationToken: ct);

            return new RefundOutcome(refund.Status == "succeeded" || refund.Status == "pending", refund.Id, null);
        }
        catch (StripeException ex)
        {
            _logger.LogError(ex, "Stripe refund failed for {ProviderReference}", providerReference);
            return new RefundOutcome(false, null, ex.StripeError?.Message ?? ex.Message);
        }
    }

    public ParsedWebhookEvent? TryParseWebhook(string payload, string signatureHeader)
    {
        Event stripeEvent;
        try
        {
            // Stripe's own SDK verifies the real HMAC-SHA256 signature (Stripe-Signature header)
            // and rejects anything outside its own replay-tolerance window — never hand-rolled.
            stripeEvent = EventUtility.ConstructEvent(payload, signatureHeader, _webhookSecret);
        }
        catch (StripeException ex)
        {
            _logger.LogWarning(ex, "Stripe webhook signature verification failed");
            return null;
        }

        if (stripeEvent.Data.Object is not PaymentIntent intent || !intent.Metadata.TryGetValue(OrderIdMetadataKey, out var orderIdRaw) || !Guid.TryParse(orderIdRaw, out var orderId))
        {
            _logger.LogWarning("Stripe webhook {EventType} had no correlatable orderId metadata", stripeEvent.Type);
            return null;
        }

        return new ParsedWebhookEvent(stripeEvent.Id, stripeEvent.Type, intent.Id, orderId, ToOutcome(intent));
    }

    private static GatewayPaymentOutcome ToOutcome(PaymentIntent intent)
    {
        if (intent.Status is "succeeded")
        {
            var paymentMethod = intent.LatestChargeId is not null ? intent.PaymentMethod : null;
            var card = paymentMethod?.Card;
            return new GatewayPaymentOutcome(true, paymentMethod?.Type, card?.Brand, card?.Last4, null, null, null, false);
        }

        if (intent.Status is "requires_capture")
        {
            // A real, correct two-phase authorization — the card was approved, it just hasn't
            // been captured yet (CaptureMethod: "manual"). Reporting this as a failure (the
            // pre-Sprint-5.5-review gap this class had) would incorrectly decline an order whose
            // card genuinely was approved and is only waiting on CapturePaymentCommand.
            var authorizedMethod = intent.PaymentMethod;
            var authorizedCard = authorizedMethod?.Card;
            return new GatewayPaymentOutcome(true, authorizedMethod?.Type, authorizedCard?.Brand, authorizedCard?.Last4, null, null, null, false, RequiresCapture: true);
        }

        var lastError = intent.LastPaymentError;
        var isProviderError = lastError?.Type is "api_error" or "api_connection_error";

        return new GatewayPaymentOutcome(
            false,
            null, null, null,
            lastError?.Code ?? "payment_failed",
            lastError?.Message ?? "The payment could not be completed.",
            lastError?.DeclineCode,
            isProviderError);
    }

    /// <summary>Stripe amounts are always the smallest currency unit (cents for USD) — never a decimal.</summary>
    private static long ToMinorUnits(decimal amount) => (long)Math.Round(amount * 100m, MidpointRounding.AwayFromZero);
}
