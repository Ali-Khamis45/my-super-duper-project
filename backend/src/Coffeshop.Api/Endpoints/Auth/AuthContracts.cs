using Coffeshop.Application.Common.Dtos;

namespace Coffeshop.Api.Endpoints.Auth;

public sealed record RegisterRequest(string Email, string Password, string FullName);

public sealed record LoginRequest(string Email, string Password, string? DeviceName);

public sealed record VerifyEmailRequest(string Token);

public sealed record ForgotPasswordRequest(string Email);

public sealed record ResetPasswordRequest(string Token, string NewPassword);

public sealed record RevokeSessionRequest(Guid SessionId);

/// <summary>
/// The wire-facing login/refresh response — deliberately omits the raw refresh token
/// (that becomes the HttpOnly cookie only, never the JSON body), per
/// docs/33_AUTH_ARCHITECTURE.md.
/// </summary>
public sealed record AuthResponse(string AccessToken, DateTimeOffset ExpiresAtUtc, UserDto User)
{
    public static AuthResponse FromResult(AuthenticationResult result) =>
        new(result.AccessToken, result.AccessTokenExpiresAtUtc, result.User);
}
