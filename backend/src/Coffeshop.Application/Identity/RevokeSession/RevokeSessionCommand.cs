using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Identity.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Identity.RevokeSession;

/// <summary>
/// POST /api/v1/auth/revoke-session. <paramref name="CurrentUserId"/> comes from the caller's
/// own JWT, never from the request body — a session can only ever be revoked by its owner,
/// enforced by scoping the lookup to that user's own <c>RefreshTokens</c> collection rather
/// than a separate ownership check bolted on afterward.
/// </summary>
public sealed record RevokeSessionCommand(Guid CurrentUserId, Guid SessionId) : ICommand<Unit>;

public sealed class RevokeSessionCommandValidator : AbstractValidator<RevokeSessionCommand>
{
    public RevokeSessionCommandValidator()
    {
        RuleFor(x => x.SessionId).NotEmpty();
    }
}

internal sealed class RevokeSessionCommandHandler(IUserRepository userRepository)
    : IRequestHandler<RevokeSessionCommand, Unit>
{
    public async Task<Unit> Handle(RevokeSessionCommand request, CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByIdAsync(request.CurrentUserId, cancellationToken)
            ?? throw new InvalidOrExpiredTokenException("Account not found.");

        user.RevokeRefreshToken(request.SessionId, "revoked-by-user", null);

        return Unit.Value;
    }
}
