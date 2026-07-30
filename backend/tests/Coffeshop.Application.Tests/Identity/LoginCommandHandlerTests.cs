using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Options;
using Coffeshop.Application.Identity.Login;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Identity.Exceptions;
using Coffeshop.Domain.Identity.ValueObjects;
using FluentAssertions;
using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;

namespace Coffeshop.Application.Tests.Identity;

public sealed class LoginCommandHandlerTests
{
    private readonly IUserRepository _userRepository = Substitute.For<IUserRepository>();
    private readonly IRoleRepository _roleRepository = Substitute.For<IRoleRepository>();
    private readonly IPasswordHasher _passwordHasher = Substitute.For<IPasswordHasher>();
    private readonly IJwtTokenService _jwtTokenService = Substitute.For<IJwtTokenService>();
    private readonly ITokenGenerator _tokenGenerator = Substitute.For<ITokenGenerator>();
    private readonly IClock _clock = Substitute.For<IClock>();

    private readonly LoginCommandHandler _sut;

    public LoginCommandHandlerTests()
    {
        _clock.UtcNow.Returns(DateTimeOffset.UtcNow);
        _tokenGenerator.Generate().Returns(("raw-refresh", "hashed-refresh"));
        var options = Options.Create(new AuthOptions());

        _sut = new LoginCommandHandler(_userRepository, _roleRepository, _passwordHasher, _jwtTokenService, _tokenGenerator, _clock, options);
    }

    private static User VerifiedUser() =>
        User.Register(Email.Create("alice@example.com"), HashedPassword.FromHash("hash"), FullName.Create("Alice"), Guid.NewGuid());

    [Fact]
    public async Task Handle_UnknownEmail_ThrowsInvalidCredentials_NeverCallsPasswordHasher()
    {
        _userRepository.GetByEmailAsync("nobody@example.com", Arg.Any<CancellationToken>()).Returns((User?)null);
        var command = new LoginCommand("nobody@example.com", "whatever", null, null, null);

        var act = () => _sut.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidCredentialsException>();
        _passwordHasher.DidNotReceiveWithAnyArgs().Verify(default!, default!);
    }

    [Fact]
    public async Task Handle_WrongPassword_ThrowsInvalidCredentials()
    {
        var user = VerifiedUser();
        _userRepository.GetByEmailAsync("alice@example.com", Arg.Any<CancellationToken>()).Returns(user);
        _passwordHasher.Verify(Arg.Any<HashedPassword>(), "wrong").Returns(false);

        var act = () => _sut.Handle(new LoginCommand("alice@example.com", "wrong", null, null, null), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidCredentialsException>();
    }

    [Fact]
    public async Task Handle_UnverifiedEmail_ThrowsEmailNotVerified()
    {
        var user = VerifiedUser(); // freshly registered users are unverified by default
        _userRepository.GetByEmailAsync("alice@example.com", Arg.Any<CancellationToken>()).Returns(user);
        _passwordHasher.Verify(Arg.Any<HashedPassword>(), "correct").Returns(true);

        var act = () => _sut.Handle(new LoginCommand("alice@example.com", "correct", null, null, null), CancellationToken.None);

        await act.Should().ThrowAsync<EmailNotVerifiedException>();
    }

    [Fact]
    public async Task Handle_ValidVerifiedCredentials_IssuesAccessAndRefreshTokens()
    {
        var user = VerifiedUser();
        user.VerifyEmail(IssueAndReturnHash(user));
        _userRepository.GetByEmailAsync("alice@example.com", Arg.Any<CancellationToken>()).Returns(user);
        _passwordHasher.Verify(Arg.Any<HashedPassword>(), "correct").Returns(true);
        _roleRepository.GetByIdsAsync(Arg.Any<IEnumerable<Guid>>(), Arg.Any<CancellationToken>())
            .Returns([RoleDefinition.Create(RoleNames.Customer, [])]);
        _jwtTokenService.IssueAccessToken(Arg.Any<User>(), Arg.Any<IReadOnlyCollection<RoleDefinition>>())
            .Returns(new AccessToken("jwt-value", DateTimeOffset.UtcNow.AddMinutes(15)));

        var result = await _sut.Handle(new LoginCommand("alice@example.com", "correct", "127.0.0.1", "test-agent", "Test Device"), CancellationToken.None);

        result.AccessToken.Should().Be("jwt-value");
        result.RefreshTokenRawValue.Should().Be("raw-refresh");
        user.RefreshTokens.Should().ContainSingle(t => t.TokenHash == "hashed-refresh");
    }

    private static string IssueAndReturnHash(User user)
    {
        var token = user.GenerateEmailVerificationToken("verify-hash", DateTimeOffset.UtcNow.AddHours(1));
        return token.TokenHash;
    }
}
