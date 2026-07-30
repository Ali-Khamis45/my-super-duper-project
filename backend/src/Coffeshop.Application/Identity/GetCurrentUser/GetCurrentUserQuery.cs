using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Domain.Identity.Exceptions;
using MediatR;

namespace Coffeshop.Application.Identity.GetCurrentUser;

/// <summary>GET /api/v1/auth/me.</summary>
public sealed record GetCurrentUserQuery(Guid UserId) : IQuery<UserDto>;

internal sealed class GetCurrentUserQueryHandler(IUserRepository userRepository, IRoleRepository roleRepository)
    : IRequestHandler<GetCurrentUserQuery, UserDto>
{
    public async Task<UserDto> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var user = await userRepository.GetByIdAsync(request.UserId, cancellationToken)
            ?? throw new InvalidOrExpiredTokenException("Account not found.");

        var roles = await roleRepository.GetByIdsAsync(user.RoleIds, cancellationToken);

        return user.ToDto(roles);
    }
}
