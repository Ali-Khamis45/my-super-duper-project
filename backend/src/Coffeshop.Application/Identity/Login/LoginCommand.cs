using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Common.Options;
using Coffeshop.Domain.Identity.Exceptions;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Options;

namespace Coffeshop.Application.Identity.Login;

/// <summary>
/// POST /api/v1/auth/login. Deliberately the same <see cref="InvalidCredentialsException"/>
/// for "no such user" and "wrong password" — never leaking which check failed, per
/// docs/33_AUTH_ARCHITECTURE.md's login sequence and docs/36_SECURITY_MODEL.md's
/// account-enumeration mitigation.
/// </summary>
public sealed record LoginCommand(string Email, string Password, string? IpAddress, string? UserAgent, string? DeviceName)
    : ICommand<AuthenticationResult>;

public sealed class LoginCommandValidator : AbstractValidator<LoginCommand>
{
    public LoginCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

internal sealed class LoginCommandHandler(
    IUserRepository userRepository,
    IRoleRepository roleRepository,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwtTokenService,
    ITokenGenerator tokenGenerator,
    IClock clock,
    IOptions<AuthOptions> authOptions) : IRequestHandler<LoginCommand, AuthenticationResult>
{
    public async Task<AuthenticationResult> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await userRepository.GetByEmailAsync(normalizedEmail, cancellationToken);

        if (user is null || !passwordHasher.Verify(user.HashedPassword, request.Password))
        {
            throw new InvalidCredentialsException();
        }

        if (!user.IsEmailVerified)
        {
            throw new EmailNotVerifiedException();
        }

        var roles = await roleRepository.GetByIdsAsync(user.RoleIds, cancellationToken);

        user.RecordLogin(request.IpAddress, request.UserAgent);

        var accessToken = jwtTokenService.IssueAccessToken(user, roles);
        var (rawRefreshToken, refreshTokenHash) = tokenGenerator.Generate();
        var refreshExpiresAt = clock.UtcNow.AddDays(authOptions.Value.RefreshTokenLifetimeDays);

        user.IssueRefreshToken(refreshTokenHash, refreshExpiresAt, request.IpAddress, request.DeviceName, request.UserAgent);

        return new AuthenticationResult(
            user.ToDto(roles),
            accessToken.Value,
            accessToken.ExpiresAtUtc,
            rawRefreshToken,
            refreshExpiresAt);
    }
}
