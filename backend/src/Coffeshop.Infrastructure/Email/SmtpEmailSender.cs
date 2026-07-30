using Coffeshop.Application.Common.Interfaces;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Coffeshop.Infrastructure.Email;

/// <summary>
/// Sends this sprint's three transactional auth emails via SMTP (MailKit) — Mailhog in dev,
/// a real relay in production, per docs/35_INFRASTRUCTURE_AND_DEPLOYMENT.md. Plain inline HTML
/// here, deliberately not the richer Razor-template pipeline docs/34_PAYMENTS_NOTIFICATIONS_SEARCH.md
/// describes for the full <c>NotificationRequest</c> system — that's real Sprint 5.4 scope
/// (multiple template keys, an admin-editable catalog); three fixed auth emails don't earn
/// that machinery yet.
/// </summary>
public sealed class SmtpEmailSender(IOptions<SmtpOptions> options, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    private readonly SmtpOptions _options = options.Value;

    public Task SendEmailVerificationAsync(string toEmail, string verificationLink, CancellationToken ct) =>
        SendAsync(
            toEmail,
            "Verify your Coffeshop email address",
            $"""<p>Welcome to Coffeshop! Please confirm your email address:</p><p><a href="{verificationLink}">Verify email</a></p><p>This link expires in 24 hours.</p>""",
            ct);

    public Task SendPasswordResetAsync(string toEmail, string resetLink, CancellationToken ct) =>
        SendAsync(
            toEmail,
            "Reset your Coffeshop password",
            $"""<p>We received a request to reset your password.</p><p><a href="{resetLink}">Reset password</a></p><p>If you didn't request this, you can safely ignore this email.</p>""",
            ct);

    public Task SendPasswordChangedAlertAsync(string toEmail, CancellationToken ct) =>
        SendAsync(
            toEmail,
            "Your Coffeshop password was changed",
            "<p>Your password was just changed. If this wasn't you, contact support immediately — every other session for your account has been signed out.</p>",
            ct);

    private async Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct)
    {
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromAddress));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = htmlBody };

        using var client = new SmtpClient();

        try
        {
            await client.ConnectAsync(_options.Host, _options.Port, _options.UseSsl, ct);

            if (!string.IsNullOrEmpty(_options.Username) && !string.IsNullOrEmpty(_options.Password))
            {
                await client.AuthenticateAsync(_options.Username, _options.Password, ct);
            }

            await client.SendAsync(message, ct);
            await client.DisconnectAsync(true, ct);
        }
        catch (Exception ex)
        {
            // Never let a transactional email failure fail the auth flow that triggered it —
            // register/forgot-password/reset-password all succeed even if the email couldn't
            // be sent; logged here for real visibility, not silently swallowed.
            logger.LogError(ex, "Failed to send email {Subject} to a recipient", subject);
        }
    }
}
