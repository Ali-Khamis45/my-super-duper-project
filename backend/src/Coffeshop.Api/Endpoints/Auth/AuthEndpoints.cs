using Coffeshop.Api.RateLimiting;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Identity.ForgotPassword;
using Coffeshop.Application.Identity.GetCurrentUser;
using Coffeshop.Application.Identity.GetSessions;
using Coffeshop.Application.Identity.Login;
using Coffeshop.Application.Identity.Logout;
using Coffeshop.Application.Identity.Register;
using Coffeshop.Application.Identity.ResetPassword;
using Coffeshop.Application.Identity.RevokeSession;
using Coffeshop.Application.Identity.VerifyEmail;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using RefreshTokenCommand = Coffeshop.Application.Identity.RefreshToken.RefreshTokenCommand;

namespace Coffeshop.Api.Endpoints.Auth;

/// <summary>
/// The 10 endpoints in docs/31_COMMERCE_ENGINEERING_CONTRACTS.md's catalog for this sprint.
/// Minimal APIs, not MVC controllers — no controller-per-resource ceremony needed at this
/// endpoint count, per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's naming conventions.
/// </summary>
public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth").WithTags("Auth");

        group.MapPost("/register", Register)
            .AllowAnonymous()
            .RequireRateLimiting(RateLimitingExtensions.AuthPolicy)
            .WithSummary("Register a new account");

        group.MapPost("/login", Login)
            .AllowAnonymous()
            .RequireRateLimiting(RateLimitingExtensions.AuthPolicy)
            .WithSummary("Log in and receive an access token + refresh cookie");

        group.MapPost("/logout", Logout)
            .AllowAnonymous()
            .WithSummary("Revoke the current session's refresh token");

        group.MapPost("/refresh", Refresh)
            .AllowAnonymous()
            .WithSummary("Rotate the refresh token and mint a new access token");

        group.MapGet("/me", Me)
            .RequireAuthorization()
            .WithSummary("The current authenticated user");

        group.MapPost("/verify-email", VerifyEmail)
            .AllowAnonymous()
            .WithSummary("Consume an email verification token");

        group.MapPost("/forgot-password", ForgotPassword)
            .AllowAnonymous()
            .RequireRateLimiting(RateLimitingExtensions.AuthPolicy)
            .WithSummary("Request a password reset email (always 202)");

        group.MapPost("/reset-password", ResetPassword)
            .AllowAnonymous()
            .WithSummary("Consume a password reset token and set a new password");

        group.MapGet("/sessions", GetSessions)
            .RequireAuthorization()
            .WithSummary("List the current user's active sessions (refresh tokens)");

        group.MapPost("/revoke-session", RevokeSession)
            .RequireAuthorization()
            .WithSummary("Revoke one of the current user's sessions");

        return app;
    }

    private static async Task<IResult> Register(RegisterRequest request, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new RegisterUserCommand(request.Email, request.Password, request.FullName), ct);

        // /api/v1/users/{id} arrives with the Administration Platform (Sprint 5.4) — this is
        // the correct, real target URI even though nothing serves it yet.
        return Results.Created($"/api/v1/users/{dto.Id}", dto);
    }

    private static async Task<IResult> Login(LoginRequest request, HttpContext httpContext, ISender sender, CancellationToken ct)
    {
        var command = new LoginCommand(
            request.Email,
            request.Password,
            httpContext.Connection.RemoteIpAddress?.ToString(),
            httpContext.Request.Headers.UserAgent.ToString(),
            request.DeviceName);

        var result = await sender.Send(command, ct);

        httpContext.Response.SetRefreshTokenCookie(result.RefreshTokenRawValue, result.RefreshTokenExpiresAtUtc);

        return Results.Ok(AuthResponse.FromResult(result));
    }

    private static async Task<IResult> Logout(HttpContext httpContext, ISender sender, CancellationToken ct)
    {
        var rawToken = httpContext.Request.GetRefreshTokenCookie();
        await sender.Send(new LogoutCommand(rawToken), ct);
        httpContext.Response.DeleteRefreshTokenCookie();
        return Results.NoContent();
    }

    private static async Task<IResult> Refresh(HttpContext httpContext, ISender sender, CancellationToken ct)
    {
        var rawToken = httpContext.Request.GetRefreshTokenCookie();

        if (string.IsNullOrEmpty(rawToken))
        {
            return Results.Problem(statusCode: StatusCodes.Status401Unauthorized, title: "No refresh token was presented.");
        }

        var command = new RefreshTokenCommand(
            rawToken,
            httpContext.Connection.RemoteIpAddress?.ToString(),
            httpContext.Request.Headers.UserAgent.ToString(),
            null);

        var result = await sender.Send(command, ct);

        httpContext.Response.SetRefreshTokenCookie(result.RefreshTokenRawValue, result.RefreshTokenExpiresAtUtc);

        return Results.Ok(AuthResponse.FromResult(result));
    }

    private static async Task<IResult> Me(ICurrentUserService currentUser, ISender sender, CancellationToken ct)
    {
        var dto = await sender.Send(new GetCurrentUserQuery(currentUser.UserId!.Value), ct);
        return Results.Ok(dto);
    }

    private static async Task<IResult> VerifyEmail(VerifyEmailRequest request, ISender sender, CancellationToken ct)
    {
        await sender.Send(new VerifyEmailCommand(request.Token), ct);
        return Results.NoContent();
    }

    private static async Task<IResult> ForgotPassword(ForgotPasswordRequest request, ISender sender, CancellationToken ct)
    {
        await sender.Send(new ForgotPasswordCommand(request.Email), ct);
        return Results.Accepted();
    }

    private static async Task<IResult> ResetPassword(ResetPasswordRequest request, HttpContext httpContext, ISender sender, CancellationToken ct)
    {
        await sender.Send(new ResetPasswordCommand(request.Token, request.NewPassword, httpContext.Connection.RemoteIpAddress?.ToString()), ct);
        httpContext.Response.DeleteRefreshTokenCookie();
        return Results.NoContent();
    }

    private static async Task<IResult> GetSessions(
        HttpContext httpContext,
        ICurrentUserService currentUser,
        ITokenGenerator tokenGenerator,
        ISender sender,
        CancellationToken ct)
    {
        var rawToken = httpContext.Request.GetRefreshTokenCookie();
        var currentHash = rawToken is null ? null : tokenGenerator.Hash(rawToken);

        var sessions = await sender.Send(new GetSessionsQuery(currentUser.UserId!.Value, currentHash), ct);
        return Results.Ok(sessions);
    }

    private static async Task<IResult> RevokeSession(
        RevokeSessionRequest request,
        ICurrentUserService currentUser,
        ISender sender,
        CancellationToken ct)
    {
        await sender.Send(new RevokeSessionCommand(currentUser.UserId!.Value, request.SessionId), ct);
        return Results.NoContent();
    }
}
