using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Mapping;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Common.Options;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Identity.Exceptions;
using Coffeshop.Domain.Identity.ValueObjects;
using FluentValidation;
using MediatR;
using Microsoft.Extensions.Options;

namespace Coffeshop.Application.Identity.Register;

/// <summary>POST /api/v1/auth/register. Returns 201 with a UserDto — no tokens issued yet, per docs/33_AUTH_ARCHITECTURE.md's register sequence.</summary>
public sealed record RegisterUserCommand(string Email, string Password, string FullName) : ICommand<UserDto>;

public sealed class RegisterUserCommandValidator : AbstractValidator<RegisterUserCommand>
{
    public RegisterUserCommandValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(256);

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(128)
            .Must(HaveRequiredComplexity)
            .WithMessage("Password must contain an uppercase letter, a lowercase letter, and a digit.");

        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
    }

    private static bool HaveRequiredComplexity(string password) =>
        password.Any(char.IsUpper) && password.Any(char.IsLower) && password.Any(char.IsDigit);
}

internal sealed class RegisterUserCommandHandler(
    IUserRepository userRepository,
    IRoleRepository roleRepository,
    IPasswordHasher passwordHasher,
    ITokenGenerator tokenGenerator,
    IEmailSender emailSender,
    IClock clock,
    IOptions<AuthOptions> authOptions) : IRequestHandler<RegisterUserCommand, UserDto>
{
    public async Task<UserDto> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        var email = Email.Create(request.Email);

        if (await userRepository.ExistsByEmailAsync(email.Value, cancellationToken))
        {
            throw new EmailAlreadyRegisteredException();
        }

        var defaultRole = await roleRepository.GetByNameAsync(RoleNames.Customer, cancellationToken)
            ?? throw new InvalidOperationException($"Default role '{RoleNames.Customer}' is not seeded.");

        var hashedPassword = passwordHasher.Hash(request.Password);
        var fullName = FullName.Create(request.FullName);

        var user = User.Register(email, hashedPassword, fullName, defaultRole.Id);

        var (rawToken, tokenHash) = tokenGenerator.Generate();
        user.GenerateEmailVerificationToken(tokenHash, clock.UtcNow.AddHours(authOptions.Value.EmailVerificationTokenLifetimeHours));

        userRepository.Add(user);

        var verificationLink = $"{authOptions.Value.FrontendBaseUrl}/verify-email?token={Uri.EscapeDataString(rawToken)}";
        await emailSender.SendEmailVerificationAsync(email.Value, verificationLink, cancellationToken);

        return user.ToDto([defaultRole]);
    }
}
