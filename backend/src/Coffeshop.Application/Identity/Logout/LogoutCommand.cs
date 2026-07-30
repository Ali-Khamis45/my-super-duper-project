using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using MediatR;

namespace Coffeshop.Application.Identity.Logout;

/// <summary>
/// POST /api/v1/auth/logout. Revokes exactly the refresh token presented in the cookie —
/// a no-op (not an error) if it's already invalid/missing, since logging out an
/// already-logged-out session should never surface as a failure to the client.
/// </summary>
public sealed record LogoutCommand(string? RefreshTokenRawValue) : ICommand<Unit>;

internal sealed class LogoutCommandHandler(IUserRepository userRepository, ITokenGenerator tokenGenerator)
    : IRequestHandler<LogoutCommand, Unit>
{
    public async Task<Unit> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(request.RefreshTokenRawValue))
        {
            return Unit.Value;
        }

        var hash = tokenGenerator.Hash(request.RefreshTokenRawValue);
        var user = await userRepository.GetByRefreshTokenHashAsync(hash, cancellationToken);

        if (user is null)
        {
            return Unit.Value;
        }

        var token = user.RefreshTokens.SingleOrDefault(t => t.TokenHash == hash);

        if (token is not null)
        {
            user.RevokeRefreshToken(token.Id, "logout", null);
        }

        return Unit.Value;
    }
}
