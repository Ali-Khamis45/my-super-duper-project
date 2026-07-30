namespace Coffeshop.Application.Common.Dtos;

/// <summary>
/// Returned by every handler that mints a fresh token pair (login, refresh). Carries the raw
/// refresh token value so Coffeshop.Api can set it as an HttpOnly cookie — Application has no
/// concept of cookies/HTTP, so this is a plain data carrier, not a response contract.
/// <b>Coffeshop.Api must never serialize <see cref="RefreshTokenRawValue"/> into a JSON
/// response body</b> — it exists only to become a Set-Cookie header value, per
/// docs/33_AUTH_ARCHITECTURE.md's token strategy.
/// </summary>
public sealed record AuthenticationResult(
    UserDto User,
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAtUtc,
    string RefreshTokenRawValue,
    DateTimeOffset RefreshTokenExpiresAtUtc);
