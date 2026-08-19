using Coffeshop.Application.Common.Behaviors;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using FluentAssertions;
using MediatR;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Xunit;

namespace Coffeshop.Application.Tests.Common;

public sealed record FakeCommand : ICommand<Unit>;

public sealed record FakeQuery : IQuery<Unit>;

public sealed class UnitOfWorkBehaviorTests
{
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly UnitOfWorkBehavior<FakeCommand, Unit> _sut;

    public UnitOfWorkBehaviorTests()
    {
        _sut = new UnitOfWorkBehavior<FakeCommand, Unit>(_unitOfWork, Substitute.For<ILogger<UnitOfWorkBehavior<FakeCommand, Unit>>>());
    }

    [Fact]
    public async Task Handle_HandlerSucceeds_SavesOnceAfterNext()
    {
        await _sut.Handle(new FakeCommand(), (_) => Task.FromResult(Unit.Value), CancellationToken.None);

        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_QueryRequest_NeverSaves()
    {
        var sut = new UnitOfWorkBehavior<FakeQuery, Unit>(_unitOfWork, Substitute.For<ILogger<UnitOfWorkBehavior<FakeQuery, Unit>>>());

        await sut.Handle(new FakeQuery(), (_) => Task.FromResult(Unit.Value), CancellationToken.None);

        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_HandlerThrowsBusinessException_StillSavesBeforeRethrowing()
    {
        var act = () => _sut.Handle(new FakeCommand(), (_) => throw new InvalidOperationException("business rule violated"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    /// <summary>
    /// The real Sprint 5.5 bug: a client disconnect mid-command cancels the ambient
    /// <see cref="CancellationToken"/>, the handler's own awaits then throw
    /// <see cref="OperationCanceledException"/>, and the recovery save must not be defeated by
    /// that same cancelled token — otherwise an already-applied mutation (e.g. a captured
    /// payment marking the order paid) is silently lost. See UnitOfWorkBehavior's own doc
    /// comment.
    /// </summary>
    [Fact]
    public async Task Handle_HandlerThrowsBecauseOfCancellation_StillAttemptsSaveWithoutBeingCancelledItself()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        var act = () => _sut.Handle(new FakeCommand(), (_) => throw new OperationCanceledException(cts.Token), cts.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();

        // Must be called with a token that is NOT the cancelled one — CancellationToken.None,
        // per the fix — otherwise the save itself would throw before ever reaching Npgsql.
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Is<CancellationToken>(t => !t.IsCancellationRequested));
    }

    [Fact]
    public async Task Handle_HandlerSucceedsButSaveFails_PropagatesTheSaveException()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns<Task<int>>(_ => throw new InvalidOperationException("db unavailable"));

        var act = () => _sut.Handle(new FakeCommand(), (_) => Task.FromResult(Unit.Value), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Handle_HandlerThrowsAndRecoverySaveAlsoFails_OriginalExceptionWins()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns<Task<int>>(_ => throw new InvalidOperationException("db unavailable during recovery save"));

        var act = () => _sut.Handle(new FakeCommand(), (_) => throw new ArgumentException("original business failure"), CancellationToken.None);

        (await act.Should().ThrowAsync<ArgumentException>()).WithMessage("original business failure");
    }
}
