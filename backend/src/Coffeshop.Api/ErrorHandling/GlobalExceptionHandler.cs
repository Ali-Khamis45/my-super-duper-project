using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Identity.Exceptions;
using Coffeshop.Domain.Ordering.Exceptions;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

        // Catalog (Sprint 5.2) — same discipline: a specific domain exception maps to a
        // specific status/type, never a generic 500 for a well-understood business rule.
        ProductNotFoundException or CategoryNotFoundException or IngredientNotFoundException or IngredientCategoryNotFoundException
            => (StatusCodes.Status404NotFound, exception.Message, "not-found"),
        SkuAlreadyExistsException or CategoryAlreadyExistsException or IngredientAlreadyExistsException
            => (StatusCodes.Status409Conflict, exception.Message, "already-exists"),
        ProductArchivedException or InvalidProductStatusTransitionException
            => (StatusCodes.Status409Conflict, exception.Message, "invalid-status-transition"),
        InvalidMoneyException or InvalidPriceException or InvalidSkuException or InvalidProductTagException or InvalidIngredientCompatibilityException
            => (StatusCodes.Status400BadRequest, exception.Message, "invalid-input"),
        ProductNotAvailableException => (StatusCodes.Status409Conflict, exception.Message, "product-not-available"),

        // Ordering (Sprint 5.3) — same discipline as Catalog above.
        OrderNotFoundException or OrderItemNotFoundException => (StatusCodes.Status404NotFound, exception.Message, "not-found"),
        OrderNotEditableException or InvalidOrderStatusTransitionException
            => (StatusCodes.Status409Conflict, exception.Message, "invalid-status-transition"),
        EmptyOrderException or InvalidOrderIdentityException or InvalidGuestOrderInfoException or InvalidRecipeSelectionException or InvalidOrderNumberException
            => (StatusCodes.Status400BadRequest, exception.Message, "invalid-input"),

        // A genuine concurrent-write conflict (two admins editing the same product at once) —
        // EF Core's own xmin-backed optimistic concurrency check throwing this is the real
        // protection; mapping it to 409 here (previously falling through to an unmapped 500)
        // is what makes that protection visible as a real, correct API response instead of a
        // server error, per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md's concurrency convention.
        DbUpdateConcurrencyException => (StatusCodes.Status409Conflict, "This record was modified by someone else. Reload and try again.", "concurrency-conflict"),

        _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred.", "internal-server-error"),
    };
}
