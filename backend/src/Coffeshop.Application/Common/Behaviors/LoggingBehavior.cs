using MediatR;
using Microsoft.Extensions.Logging;

namespace Coffeshop.Application.Common.Behaviors;

/// <summary>
/// Wraps every request (including validation failures) with a structured start/end log line —
/// never a string-interpolated message, per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's logging
/// conventions. The outermost pipeline step, per the same doc's CQRS/MediatR ordering rule.
/// </summary>
public sealed class LoggingBehavior<TRequest, TResponse>(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        logger.LogInformation("Handling {RequestName}", requestName);

        try
        {
            var response = await next(cancellationToken);
            logger.LogInformation("Handled {RequestName}", requestName);
            return response;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "{RequestName} failed: {ExceptionType}", requestName, ex.GetType().Name);
            throw;
        }
    }
}
