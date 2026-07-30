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
}
