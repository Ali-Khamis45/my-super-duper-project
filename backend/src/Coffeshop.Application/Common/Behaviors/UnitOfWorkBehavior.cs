using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Coffeshop.Application.Common.Behaviors;

/// <summary>
/// Calls <c>SaveChangesAsync</c> once per command, on both the happy path and when the handler
/// throws — never for queries, never from inside a handler. The single place "did this
/// command's mutation get persisted" has to be checked, per
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's repository rules.
///
/// Saving on the throw path is not an edge case — it's the point. A real bug found during this
/// sprint's manual verification: refresh-token reuse-detection mutates the aggregate (revokes
/// every session) and then throws <c>RefreshTokenReuseDetectedException</c> to signal the
/// caller. With a naive "save only after next() returns", that entire revoke-all mutation was
/// silently discarded — the exception short-circuited before SaveChangesAsync ever ran, so the
/// security response never reached the database. "Mutate, then throw a business exception" is
/// a legitimate, common domain pattern (docs/41's own exception-handling rules assume it), so
/// the persistence layer has to support it, not just the pure happy path.
/// </summary>
public sealed class UnitOfWorkBehavior<TRequest, TResponse>(
    IUnitOfWork unitOfWork,
    ILogger<UnitOfWorkBehavior<TRequest, TResponse>> logger)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        if (!IsCommand(request))
        {
            return await next(cancellationToken);
        }

        try
        {
            var response = await next(cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            return response;
        }
        catch (Exception)
        {
            // The handler's own exception is always what the caller sees — a secondary
            // save failure here is logged, not allowed to mask the original, more meaningful
            // error. Still attempted, since the mutation that led to the original exception
            // (e.g. a revoke-all) is often exactly what needs to be durable.
            try
            {
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }
            catch (Exception saveException)
            {
                logger.LogError(saveException, "Failed to persist pending changes while handling a {RequestName} failure", typeof(TRequest).Name);
            }

            throw;
        }
    }

    private static bool IsCommand(TRequest request) =>
        request.GetType().GetInterfaces().Any(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(ICommand<>));
}
