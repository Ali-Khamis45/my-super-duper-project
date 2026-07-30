using MediatR;

namespace Coffeshop.Application.Common.Messaging;

/// <summary>
/// Marker distinguishing a mutation from a read — <c>UnitOfWorkBehavior</c> calls
/// <c>SaveChangesAsync</c> only after a request implementing this interface, never after an
/// <see cref="IQuery{TResponse}"/>, per docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's CQRS rules.
/// </summary>
public interface ICommand<out TResponse> : IRequest<TResponse>;

public interface IQuery<out TResponse> : IRequest<TResponse>;
