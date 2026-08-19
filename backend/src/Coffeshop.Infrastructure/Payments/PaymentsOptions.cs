namespace Coffeshop.Infrastructure.Payments;

/// <summary>
/// Bound from configuration's <c>Payments</c> section. <see cref="Provider"/> selects which real
/// <c>IPaymentGateway</c> implementation <see cref="DependencyInjection.AddPaymentsInfrastructure"/>
/// registers — per docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md's own "the active provider is
/// resolved by DI, configurable per environment" design. Defaults to <c>"Fake"</c> deliberately:
/// this repo ships with no real Stripe secret key (see this sprint's own review for why — no
/// Stripe account exists in this environment), so a fresh clone must opt *into* Stripe
/// explicitly via real configuration, never silently attempt it with a missing key.
/// </summary>
public sealed class PaymentsOptions
{
    public const string SectionName = "Payments";

    public string Provider { get; init; } = "Fake";

    /// <summary>
    /// <c>"Automatic"</c> (default) — a successful charge captures immediately, the only mode
    /// this project used before Sprint 5.5's own adversarial review found <c>CapturePaymentCommand</c>
    /// was real, correct, and completely unreachable: nothing ever produced an
    /// <c>Authorized</c>-only attempt for it to act on. <c>"Manual"</c> makes both gateways stop
    /// at authorization (Stripe's real <c>capture_method: manual</c>; <see cref="FakePaymentGateway"/>'s
    /// matching simulation) so the two-phase flow is genuinely exercisable — a deployment-wide
    /// setting, not a per-order choice, since nothing in this sprint's brief specifies what would
    /// decide that per order.
    /// </summary>
    public string CaptureMode { get; init; } = "Automatic";

    public string? StripeSecretKey { get; init; }

    public string? StripePublishableKey { get; init; }

    public string? StripeWebhookSecret { get; init; }
}
