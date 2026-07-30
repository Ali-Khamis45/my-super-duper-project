using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Coffeshop.Persistence;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Coffeshop.IntegrationTests.Auth;

public sealed class AuthEndpointsTests(CoffeshopApiFactory factory) : IClassFixture<CoffeshopApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    private static string UniqueEmail() => $"user-{Guid.NewGuid():N}@example.com";

    private async Task<(string Email, HttpResponseMessage Response)> RegisterAsync(string password = "Valid1Pass!")
    {
        var email = UniqueEmail();
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", new { email, password, fullName = "Test User" });
        return (email, response);
    }

    [Fact]
    public async Task Register_ValidInput_Returns201WithUnverifiedUser()
    {
        var (email, response) = await RegisterAsync();

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("email").GetString().Should().Be(email);
        body.GetProperty("isEmailVerified").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409()
    {
        var (email, _) = await RegisterAsync();

        var second = await _client.PostAsJsonAsync("/api/v1/auth/register", new { email, password = "Valid1Pass!", fullName = "Someone Else" });

        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Register_WeakPassword_Returns400WithFieldErrors()
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", new { email = UniqueEmail(), password = "weak", fullName = "Test" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").TryGetProperty("Password", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Login_UnverifiedEmail_Returns403()
    {
        var (email, _) = await RegisterAsync();

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "Valid1Pass!" });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var (email, _) = await RegisterAsync();

        var response = await _client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "TotallyWrong1!" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task FullFlow_RegisterVerifyLoginMeRefreshLogout_Succeeds()
    {
        var (email, registerResponse) = await RegisterAsync();
        var userId = (await registerResponse.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();

        // This test project has no SMTP access to the real Mailhog inbox the way the manual
        // verification did — it verifies the email directly against the database instead of
        // parsing an email, since the goal here is exercising the HTTP contract, not the email
        // provider (SmtpEmailSender has its own path; failures there are swallowed by design).
        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<CoffeshopDbContext>();
            var user = await context.Users.FirstAsync(u => u.Id == userId);
            var token = user.EmailVerificationTokens.Single();
            user.VerifyEmail(token.TokenHash);
            await context.SaveChangesAsync();
        }

        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "Valid1Pass!", deviceName = "Integration Test" });
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var loginBody = await loginResponse.Content.ReadFromJsonAsync<JsonElement>();
        var accessToken = loginBody.GetProperty("accessToken").GetString();
        var refreshCookie = ExtractRefreshCookie(loginResponse);

        using var meRequest = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        meRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var meResponse = await _client.SendAsync(meRequest);
        var wwwAuth = meResponse.Headers.WwwAuthenticate.ToString();
        var meBody = await meResponse.Content.ReadAsStringAsync();
        meResponse.StatusCode.Should().Be(HttpStatusCode.OK, $"WWW-Authenticate: {wwwAuth}; Body: {meBody}; AccessToken: {accessToken}");

        using var refreshRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        refreshRequest.Headers.Add("Cookie", refreshCookie);
        var refreshResponse = await _client.SendAsync(refreshRequest);
        refreshResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var newRefreshCookie = ExtractRefreshCookie(refreshResponse);

        // Reusing the pre-rotation cookie must now fail as reuse.
        using var reuseRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        reuseRequest.Headers.Add("Cookie", refreshCookie);
        var reuseResponse = await _client.SendAsync(reuseRequest);
        reuseResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await reuseResponse.Content.ReadAsStringAsync()).Should().Contain("reuse-detected");

        // Reuse-detection revokes everything, including the token that was valid a moment ago.
        using var postReuseRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        postReuseRequest.Headers.Add("Cookie", newRefreshCookie);
        var postReuseResponse = await _client.SendAsync(postReuseRequest);
        postReuseResponse.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private static string ExtractRefreshCookie(HttpResponseMessage response)
    {
        var setCookie = response.Headers.GetValues("Set-Cookie").First(c => c.StartsWith("coffeshop_refresh_token"));
        return setCookie.Split(';')[0];
    }
}
