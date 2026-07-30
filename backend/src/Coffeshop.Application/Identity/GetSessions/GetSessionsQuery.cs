using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Identity.Exceptions;
using MediatR;

namespace Coffeshop.Application.Identity.GetSessions;

/// <summary>GET /api/v1/auth/sessions — every active RefreshToken IS a session, per docs/33_AUTH_ARCHITECTURE.md.</summary>
public sealed record GetSessionsQuery(Guid UserId, string? CurrentRefreshTokenHash) : IQuery<IReadOnlyList<SessionDto>>;

internal sealed class GetSessionsQueryHandler(IUserRepository userRepository)
    : IRequestHandler<GetSessionsQuery, IReadOnlyList<SessionDto>>
{
    public async Task<IReadOnlyList<SessionDto>> Handle(GetSessionsQuery request, CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByIdAsync(request.UserId, cancellationToken)
            ?? throw new InvalidOrExpiredTokenException("Account not found.");

        return [.. user.RefreshTokens
            .Where(t => t.IsActive)
            .OrderByDescending(t => t.LastUsedAtUtc ?? t.CreatedAtUtc)
            .Select(t => t.ToSessionDto(t.TokenHash == request.CurrentRefreshTokenHash))];
    }
}
