using Coffeshop.Domain.Identity.Exceptions;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Coffeshop.Api.ErrorHandling;

/// <summary>
/// One global exception handler, never per-endpoint try/catch — per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's exception-handling rules. Maps specific domain
/// exception types to specific HTTP status codes and RFC 9457 Problem Details <c>type</c>
/// values; anything unrecognized becomes a generic 500 with no internal detail leaked, per
/// docs/36_SECURITY_MODEL.md.
/// </summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    private const string ErrorTypeBaseUri = "https://coffeshop.dev/errors/";

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, title, errorSlug) = Map(exception);

        if (statusCode >= 500)
        {
            logger.LogError(exception, "Unhandled exception processing {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);
        }

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Type = $"{ErrorTypeBaseUri}{errorSlug}",
            Instance = httpContext.Request.Path,
        };

        if (exception is ValidationException validationException)
        {
            problemDetails.Extensions["errors"] = validationException.Errors
                .GroupBy(e => e.PropertyName)
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
        }

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/problem+json";
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }

    private static (int StatusCode, string Title, string Slug) Map(Exception exception) => exception switch
    {
        ValidationException => (StatusCodes.Status400BadRequest, "One or more validation errors occurred.", "validation-failed"),
        InvalidCredentialsException => (StatusCodes.Status401Unauthorized, exception.Message, "invalid-credentials"),
        EmailNotVerifiedException => (StatusCodes.Status403Forbidden, exception.Message, "email-not-verified"),
        EmailAlreadyRegisteredException => (StatusCodes.Status409Conflict, exception.Message, "email-already-registered"),
        InvalidOrExpiredTokenException => (StatusCodes.Status401Unauthorized, exception.Message, "invalid-or-expired-token"),
        RefreshTokenReuseDetectedException => (StatusCodes.Status401Unauthorized, exception.Message, "refresh-token-reuse-detected"),
        InvalidEmailException or InvalidFullNameException => (StatusCodes.Status400BadRequest, exception.Message, "invalid-input"),
        _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.", "internal-server-error"),
    };
}
