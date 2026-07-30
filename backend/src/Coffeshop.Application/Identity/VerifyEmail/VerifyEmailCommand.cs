using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Identity.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Identity.VerifyEmail;

/// <summary>POST /api/v1/auth/verify-email. The token identifies the user (repository searches by hash), not a separately-supplied user id.</summary>
public sealed record VerifyEmailCommand(string Token) : ICommand<Unit>;

public sealed class VerifyEmailCommandValidator : AbstractValidator<VerifyEmailCommand>
{
    public VerifyEmailCommandValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
    }
}

internal sealed class VerifyEmailCommandHandler(IUserRepository userRepository, ITokenGenerator tokenGenerator)
    : IRequestHandler<VerifyEmailCommand, Unit>
{
    public async Task<Unit> Handle(VerifyEmailCommand request, CancellationToken cancellationToken)
    {
        var hash = tokenGenerator.Hash(request.Token);

        var user = await userRepository.GetByEmailVerificationTokenHashAsync(hash, cancellationToken)
            ?? throw new InvalidOrExpiredTokenException("This email verification link is invalid or has expired.");

        user.VerifyEmail(hash);

        return Unit.Value;
    }
}
