namespace Coffeshop.Api.Endpoints.Auth;

/// <summary>
/// The refresh-token cookie: HttpOnly/Secure/SameSite=Strict, per
/// docs/33_AUTH_ARCHITECTURE.md's token strategy — never readable by JavaScript, closing the
/// XSS-exfiltration path for the long-lived credential.
/// </summary>
public static class AuthCookies
{
    public const string RefreshTokenCookieName = "coffeshop_refresh_token";

    public static void SetRefreshTokenCookie(this HttpResponse response, string rawValue, DateTimeOffset expiresAtUtc)
    {
        response.Cookies.Append(RefreshTokenCookieName, rawValue, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = expiresAtUtc,
            Path = "/api/v1/auth",
        });
    }

    public static void DeleteRefreshTokenCookie(this HttpResponse response)
    {
        response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions { Path = "/api/v1/auth" });
    }

    public static string? GetRefreshTokenCookie(this HttpRequest request) =>
        request.Cookies.TryGetValue(RefreshTokenCookieName, out var value) ? value : null;
}
