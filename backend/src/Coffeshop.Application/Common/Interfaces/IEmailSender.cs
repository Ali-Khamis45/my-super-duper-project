namespace Coffeshop.Application.Common.Interfaces;

/// <summary>
/// Per docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md's <c>IEmailProvider</c> — named
/// <c>IEmailSender</c> here to avoid colliding with the not-yet-built full notification
/// pipeline (<c>NotificationRequest</c>, Sprint 5.4); this sprint's three transactional auth
/// emails (verification/reset/security-alert) send directly through this narrower interface.
/// Implemented in Coffeshop.Infrastructure via MailKit against SMTP (Mailhog in dev).
/// </summary>
public interface IEmailSender
{
    Task SendEmailVerificationAsync(string toEmail, string verificationLink, CancellationToken ct);

    Task SendPasswordResetAsync(string toEmail, string resetLink, CancellationToken ct);

    Task SendPasswordChangedAlertAsync(string toEmail, CancellationToken ct);

    /// <summary>Additive (Sprint 5.5) — the real "Confirmation Email" this sprint's own Phase 7 brief names, sent once a payment actually captures (<c>ConfirmPaymentCommandHandler</c>/<c>ProcessPaymentWebhookCommandHandler</c>, whichever resolves it first). Extends this narrower interface with a fourth method rather than standing up docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md's never-built full <c>NotificationRequest</c>/templated pipeline — the same "three fixed emails don't earn that machinery yet" reasoning this interface's own doc comment already gives, now four.</summary>
    Task SendOrderConfirmationAsync(string toEmail, string orderNumber, decimal total, CancellationToken ct);
}
