using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Common.Options;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Options;

namespace Coffeshop.Application.Identity.ForgotPassword;

/// <summary>
/// POST /api/v1/auth/forgot-password. Always succeeds from the caller's perspective — never
/// reveals whether the email exists, per docs/33_AUTH_ARCHITECTURE.md's forgot-password
/// sequence. If no matching user exists, this handler silently no-ops.
/// </summary>
public sealed record ForgotPasswordCommand(string Email) : ICommand<Unit>;

public sealed class ForgotPasswordCommandValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}

internal sealed class ForgotPasswordCommandHandler(
    IUserRepository userRepository,
    ITokenGenerator tokenGenerator,
    IEmailSender emailSender,
    IClock clock,
    IOptions<AuthOptions> authOptions) : IRequestHandler<ForgotPasswordCommand, Unit>
{
    public async Task<Unit> Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await userRepository.GetByEmailAsync(normalizedEmail, cancellationToken);

        if (user is null)
        {
            return Unit.Value;
        }

        var (rawToken, tokenHash) = tokenGenerator.Generate();
        user.RequestPasswordReset(tokenHash, clock.UtcNow.AddMinutes(authOptions.Value.PasswordResetTokenLifetimeMinutes));

        var resetLink = $"{authOptions.Value.FrontendBaseUrl}/reset-password?token={Uri.EscapeDataString(rawToken)}";
        await emailSender.SendPasswordResetAsync(normalizedEmail, resetLink, cancellationToken);

        return Unit.Value;
    }
}
