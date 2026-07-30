using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Options;
using Coffeshop.Application.Identity.Register;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Identity.Exceptions;
using Coffeshop.Domain.Identity.ValueObjects;
using FluentAssertions;
using Microsoft.Extensions.Options;
using NSubstitute;
using Xunit;

namespace Coffeshop.Application.Tests.Identity;

public sealed class RegisterUserCommandHandlerTests
{
    private readonly IUserRepository _userRepository = Substitute.For<IUserRepository>();
    private readonly IRoleRepository _roleRepository = Substitute.For<IRoleRepository>();
    private readonly IPasswordHasher _passwordHasher = Substitute.For<IPasswordHasher>();
    private readonly ITokenGenerator _tokenGenerator = Substitute.For<ITokenGenerator>();
    private readonly IEmailSender _emailSender = Substitute.For<IEmailSender>();
    private readonly IClock _clock = Substitute.For<IClock>();

    private readonly RegisterUserCommandHandler _sut;

    public RegisterUserCommandHandlerTests()
    {
        _clock.UtcNow.Returns(DateTimeOffset.UtcNow);
        _tokenGenerator.Generate().Returns(("raw-token", "hashed-token"));
        _passwordHasher.Hash(Arg.Any<string>()).Returns(HashedPassword.FromHash("hashed"));

        var options = Options.Create(new AuthOptions { FrontendBaseUrl = "http://localhost:3000" });

        _sut = new RegisterUserCommandHandler(
            _userRepository, _roleRepository, _passwordHasher, _tokenGenerator, _emailSender, _clock, options);
    }

    [Fact]
    public async Task Handle_EmailAlreadyRegistered_ThrowsWithoutTouchingRolesOrEmail()
    {
        _userRepository.ExistsByEmailAsync("taken@example.com", Arg.Any<CancellationToken>()).Returns(true);
        var command = new RegisterUserCommand("taken@example.com", "Valid1Pass!", "Someone");

        var act = () => _sut.Handle(command, CancellationToken.None);

        await act.Should().ThrowAsync<EmailAlreadyRegisteredException>();
        await _emailSender.DidNotReceive().SendEmailVerificationAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_NewEmail_RegistersUserAndSendsVerificationEmail()
    {
        _userRepository.ExistsByEmailAsync("new@example.com", Arg.Any<CancellationToken>()).Returns(false);
        var customerRole = RoleDefinition.Create(RoleNames.Customer, []);
        _roleRepository.GetByNameAsync(RoleNames.Customer, Arg.Any<CancellationToken>()).Returns(customerRole);

        var command = new RegisterUserCommand("new@example.com", "Valid1Pass!", "New Person");

        var result = await _sut.Handle(command, CancellationToken.None);

        result.Email.Should().Be("new@example.com");
        result.IsEmailVerified.Should().BeFalse();
        result.Roles.Should().Contain(RoleNames.Customer);
        _userRepository.Received(1).Add(Arg.Any<User>());
        await _emailSender.Received(1).SendEmailVerificationAsync(
            "new@example.com",
            Arg.Is<string>(link => link != null && link.Contains("raw-token")),
            Arg.Any<CancellationToken>());
    }
}
