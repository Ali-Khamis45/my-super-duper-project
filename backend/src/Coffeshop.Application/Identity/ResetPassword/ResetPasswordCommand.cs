using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Identity.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Identity.ResetPassword;

/// <summary>
/// POST /api/v1/auth/reset-password. Consuming the token also revokes every refresh token for
/// this user (docs/33_AUTH_ARCHITECTURE.md) — a password reset ends every existing session.
/// </summary>
public sealed record ResetPasswordCommand(string Token, string NewPassword, string? IpAddress) : ICommand<Unit>;

public sealed class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty();

        RuleFor(x => x.NewPassword)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(128)
            .Must(HaveRequiredComplexity)
            .WithMessage("Password must contain an uppercase letter, a lowercase letter, and a digit.");
    }

    private static bool HaveRequiredComplexity(string password) =>
        password.Any(char.IsUpper) && password.Any(char.IsLower) && password.Any(char.IsDigit);
}

internal sealed class ResetPasswordCommandHandler(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    ITokenGenerator tokenGenerator,
    IEmailSender emailSender) : IRequestHandler<ResetPasswordCommand, Unit>
{
    public async Task<Unit> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var hash = tokenGenerator.Hash(request.Token);

        var user = await userRepository.GetByPasswordResetTokenHashAsync(hash, cancellationToken)
            ?? throw new InvalidOrExpiredTokenException("This password reset link is invalid or has expired.");

        var newHashedPassword = passwordHasher.Hash(request.NewPassword);
        user.ResetPassword(hash, newHashedPassword, request.IpAddress);

        await emailSender.SendPasswordChangedAlertAsync(user.Email.Value, cancellationToken);

        return Unit.Value;
    }
}
