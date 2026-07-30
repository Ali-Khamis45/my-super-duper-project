using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Common.Options;
using Coffeshop.Domain.Identity.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Options;

namespace Coffeshop.Application.Identity.RefreshToken;

/// <summary>
/// POST /api/v1/auth/refresh. Rotates the presented refresh token (single-use) and issues a
/// fresh access+refresh pair, per docs/33_AUTH_ARCHITECTURE.md's silent-refresh sequence.
/// A reused (already-revoked) token throws <c>RefreshTokenReuseDetectedException</c>, which
/// the aggregate itself turns into a full revoke-all before the exception propagates.
/// </summary>
public sealed record RefreshTokenCommand(string RefreshTokenRawValue, string? IpAddress, string? UserAgent, string? DeviceName)
    : ICommand<AuthenticationResult>;

public sealed class RefreshTokenCommandValidator : AbstractValidator<RefreshTokenCommand>
{
    public RefreshTokenCommandValidator()
    {
        RuleFor(x => x.RefreshTokenRawValue).NotEmpty();
    }
}

internal sealed class RefreshTokenCommandHandler(
    IUserRepository userRepository,
    IRoleRepository roleRepository,
    IJwtTokenService jwtTokenService,
    ITokenGenerator tokenGenerator,
    IClock clock,
    IOptions<AuthOptions> authOptions) : IRequestHandler<RefreshTokenCommand, AuthenticationResult>
{
    public async Task<AuthenticationResult> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var currentHash = tokenGenerator.Hash(request.RefreshTokenRawValue);

        var user = await userRepository.GetByRefreshTokenHashAsync(currentHash, cancellationToken)
            ?? throw new InvalidOrExpiredTokenException("This refresh token is not recognized.");

        var (newRawToken, newHash) = tokenGenerator.Generate();
        var newExpiresAt = clock.UtcNow.AddDays(authOptions.Value.RefreshTokenLifetimeDays);

        user.RotateRefreshToken(currentHash, newHash, newExpiresAt, request.IpAddress, request.DeviceName, request.UserAgent);

        var roles = await roleRepository.GetByIdsAsync(user.RoleIds, cancellationToken);
        var accessToken = jwtTokenService.IssueAccessToken(user, roles);

        return new AuthenticationResult(user.ToDto(roles), accessToken.Value, accessToken.ExpiresAtUtc, newRawToken, newExpiresAt);
    }
}
