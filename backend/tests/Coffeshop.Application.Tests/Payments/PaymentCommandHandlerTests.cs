using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Options;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Payments.Coordination;
using Coffeshop.Application.Payments.Commands;
using Coffeshop.Application.Payments.Interfaces;
using Coffeshop.Domain.Catalog.ValueObjects;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Ordering;
using Coffeshop.Domain.Ordering.Exceptions;
using Coffeshop.Domain.Ordering.ValueObjects;
using Coffeshop.Domain.Payments;
using Coffeshop.Domain.Payments.Exceptions;
using Coffeshop.Domain.Payments.ValueObjects;
using FluentAssertions;
using MediatR;
using NSubstitute;
using Xunit;
using Microsoft.Extensions.Options;

namespace Coffeshop.Application.Tests.Payments;

public sealed class PaymentCommandHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

    private readonly IPaymentRepository _paymentRepository = Substitute.For<IPaymentRepository>();
    private readonly IOrderRepository _orderRepository = Substitute.For<IOrderRepository>();
    private readonly IUserRepository _userRepository = Substitute.For<IUserRepository>();
    private readonly IPaymentGateway _paymentGateway = Substitute.For<IPaymentGateway>();
    private readonly IOrderPaymentCoordinator _orderPaymentCoordinator = Substitute.For<IOrderPaymentCoordinator>();
    private readonly IIdempotencyStore _idempotencyStore = Substitute.For<IIdempotencyStore>();
    private readonly IEmailSender _emailSender = Substitute.For<IEmailSender>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();
    private readonly IClock _clock = Substitute.For<IClock>();
    private readonly IOptions<PaymentRetryOptions> _paymentRetryOptions = Options.Create(new PaymentRetryOptions());

    public PaymentCommandHandlerTests()
    {
        _clock.UtcNow.Returns(Now);
        _paymentGateway.Provider.Returns(PaymentProviderName.Fake);
    }

    private static Order SubmittedOrder(decimal total = 5.00m)
    {
        var order = Order.Create(OrderNumber.FromSequenceValue(1), null, GuestOrderInfo.Create("Ada Lovelace", "ada@example.com"), FulfillmentMethod.Pickup, Now);
        order.AddItem(Guid.NewGuid(), "Cappuccino", "ESP-001", RecipeSelection.Create("cream", "medium", "kraft", "classic", "classic", "glossy", []), Money.Create(total), 1, null);
        order.Submit(Now);
        return order;
    }

    private static Payment ProcessingPayment(Guid orderId, decimal amount = 5.00m, string reference = "fake_pi_1")
    {
        var payment = Payment.Create(orderId, Money.Create(amount), PaymentProviderName.Fake, IdempotencyKey.Create($"order-{orderId}"), Now);
        payment.StartAttempt(PaymentProviderReference.Create(reference), Now);
        return payment;
    }

    private static GatewayPaymentOutcome Success() => new(true, "card", "visa", "4242", null, null, null, false);

    private static GatewayPaymentOutcome Declined() => new(false, null, null, null, "card_declined", "Your card was declined.", "insufficient_funds", false);

    private static GatewayPaymentOutcome ProviderError() => new(false, null, null, null, "provider_error", "boom", null, true);

    private static GatewayPaymentOutcome RequiresCapture() => new(true, "card", "visa", "4242", null, null, null, false, RequiresCapture: true);

    // ---- CreateCheckoutSessionCommand ----

    [Fact]
    public async Task CreateCheckoutSession_NoPriorPayment_CreatesPaymentAndStartsFirstAttempt()
    {
        var order = SubmittedOrder();
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _paymentRepository.GetByOrderIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns((Payment?)null);
        _paymentGateway.CreateIntentAsync(order.Id, order.Totals.Total.Amount, order.Totals.Total.Currency, Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new CreateIntentResult("fake_pi_new", null, null));

        var sut = new CreateCheckoutSessionCommandHandler(_paymentRepository, _orderRepository, _paymentGateway, _currentUserService, _clock, _paymentRetryOptions);
        var session = await sut.Handle(new CreateCheckoutSessionCommand(order.Id), CancellationToken.None);

        session.Status.Should().Be("started");
        _paymentRepository.Received(1).Add(Arg.Is<Payment>(p => p != null && p.OrderId == order.Id && p.Status == PaymentStatus.Processing));
    }

    [Fact]
    public async Task CreateCheckoutSession_ExistingProcessingPayment_DoubleClick_IsIdempotentNoOpAgainstGateway()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _paymentRepository.GetByOrderIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(payment);

        var sut = new CreateCheckoutSessionCommandHandler(_paymentRepository, _orderRepository, _paymentGateway, _currentUserService, _clock, _paymentRetryOptions);
        var session = await sut.Handle(new CreateCheckoutSessionCommand(order.Id), CancellationToken.None);

        session.PaymentId.Should().Be(payment.Id);
        await _paymentGateway.DidNotReceive().CreateIntentAsync(Arg.Any<Guid>(), Arg.Any<decimal>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    /// <summary>Regression test for the real, disclosed Sprint 5.5 gap: Payment.TimeoutAttempt had no caller at all, so a genuinely stuck Processing payment (client disconnected mid-confirm) could never recover through a normal retry. See CreateCheckoutSessionCommand's own doc comment and PaymentRetryOptions.</summary>
    [Fact]
    public async Task CreateCheckoutSession_ExistingProcessingPayment_StaleWellPastTheRetryWindow_TimesOutAndStartsAGenuinelyNewAttempt()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        var staleAttemptId = payment.CurrentAttempt!.Id;
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _paymentRepository.GetByOrderIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _paymentGateway.CreateIntentAsync(order.Id, Arg.Any<decimal>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new CreateIntentResult("fake_pi_new_after_timeout", null, null));

        // Well past PaymentRetryOptions's own 15-minute default — a real abandoned attempt, not a double-click.
        _clock.UtcNow.Returns(Now.AddMinutes(20));

        var sut = new CreateCheckoutSessionCommandHandler(_paymentRepository, _orderRepository, _paymentGateway, _currentUserService, _clock, _paymentRetryOptions);
        var session = await sut.Handle(new CreateCheckoutSessionCommand(order.Id), CancellationToken.None);

        await _paymentGateway.Received(1).CreateIntentAsync(order.Id, Arg.Any<decimal>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
        payment.Attempts.Should().HaveCount(2);
        payment.Attempts.First(a => a.Id == staleAttemptId).Status.Should().Be(PaymentAttemptStatus.TimedOut);
        session.PaymentId.Should().Be(payment.Id);
        session.AttemptId.Should().NotBe(staleAttemptId);
    }

    [Fact]
    public async Task CreateCheckoutSession_ExistingPendingPayment_AfterDecline_StartsANewRetryAttempt()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        payment.DeclineAttempt(payment.CurrentAttempt!.Id, PaymentFailure.Create("card_declined", "declined"), Now);
        payment.Status.Should().Be(PaymentStatus.Pending);

        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _paymentRepository.GetByOrderIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _paymentGateway.CreateIntentAsync(order.Id, Arg.Any<decimal>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new CreateIntentResult("fake_pi_retry", null, null));

        var sut = new CreateCheckoutSessionCommandHandler(_paymentRepository, _orderRepository, _paymentGateway, _currentUserService, _clock, _paymentRetryOptions);
        await sut.Handle(new CreateCheckoutSessionCommand(order.Id), CancellationToken.None);

        payment.Attempts.Should().HaveCount(2);
        payment.Status.Should().Be(PaymentStatus.Processing);
    }

    [Fact]
    public async Task CreateCheckoutSession_OrderNotSubmitted_ThrowsInvalidOrderStatusTransitionException()
    {
        var order = Order.Create(OrderNumber.FromSequenceValue(2), null, GuestOrderInfo.Create("Ada", "ada@example.com"), FulfillmentMethod.Pickup, Now);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);

        var sut = new CreateCheckoutSessionCommandHandler(_paymentRepository, _orderRepository, _paymentGateway, _currentUserService, _clock, _paymentRetryOptions);
        var act = () => sut.Handle(new CreateCheckoutSessionCommand(order.Id), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOrderStatusTransitionException>();
    }

    [Fact]
    public async Task CreateCheckoutSession_AuthenticatedNonOwner_ThrowsOrderNotFoundExceptionRatherThanLeakingExistence()
    {
        var order = Order.Create(OrderNumber.FromSequenceValue(3), Guid.NewGuid(), null, FulfillmentMethod.Pickup, Now);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _currentUserService.UserId.Returns(Guid.NewGuid());

        var sut = new CreateCheckoutSessionCommandHandler(_paymentRepository, _orderRepository, _paymentGateway, _currentUserService, _clock, _paymentRetryOptions);
        var act = () => sut.Handle(new CreateCheckoutSessionCommand(order.Id), CancellationToken.None);

        await act.Should().ThrowAsync<OrderNotFoundException>();
    }

    // ---- ConfirmPaymentCommand ----

    [Fact]
    public async Task ConfirmPayment_AlreadySucceeded_IsIdempotentNoOpAndNeverCallsGatewayAgain()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        payment.CaptureAttempt(payment.CurrentAttempt!.Id, null, Now);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);

        var sut = new ConfirmPaymentCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _orderPaymentCoordinator, _emailSender, _clock);
        var dto = await sut.Handle(new ConfirmPaymentCommand(payment.Id), CancellationToken.None);

        dto.Status.Should().Be("succeeded");
        await _paymentGateway.DidNotReceive().GetStatusAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ConfirmPayment_GatewaySucceeded_CapturesMarksOrderPaidAndSendsConfirmationEmail()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _paymentGateway.GetStatusAsync(payment.CurrentAttempt!.ProviderReference!.Value, Arg.Any<CancellationToken>()).Returns(Success());

        var sut = new ConfirmPaymentCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _orderPaymentCoordinator, _emailSender, _clock);
        var dto = await sut.Handle(new ConfirmPaymentCommand(payment.Id), CancellationToken.None);

        dto.Status.Should().Be("succeeded");
        await _orderPaymentCoordinator.Received(1).OnPaymentSucceededAsync(order.Id, Now, Arg.Any<CancellationToken>());
        await _emailSender.Received(1).SendOrderConfirmationAsync(order.GuestInfo!.Email, order.OrderNumber.Value, order.Totals.Total.Amount, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ConfirmPayment_GatewayDeclined_ReturnsPaymentToPendingWithoutTouchingOrder()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _paymentGateway.GetStatusAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(Declined());

        var sut = new ConfirmPaymentCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _orderPaymentCoordinator, _emailSender, _clock);
        var dto = await sut.Handle(new ConfirmPaymentCommand(payment.Id), CancellationToken.None);

        dto.Status.Should().Be("pending");
        payment.CurrentAttempt!.Status.Should().Be(PaymentAttemptStatus.Declined);
        await _orderPaymentCoordinator.DidNotReceiveWithAnyArgs().OnPaymentSucceededAsync(default, default, default);
    }

    [Fact]
    public async Task ConfirmPayment_GatewayProviderError_ErrorsTheAttemptDistinctFromADecline()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _paymentGateway.GetStatusAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(ProviderError());

        var sut = new ConfirmPaymentCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _orderPaymentCoordinator, _emailSender, _clock);
        await sut.Handle(new ConfirmPaymentCommand(payment.Id), CancellationToken.None);

        payment.CurrentAttempt!.Status.Should().Be(PaymentAttemptStatus.Errored);
    }

    [Fact]
    public async Task ConfirmPayment_NothingPendingToConfirm_ThrowsInvalidPaymentStatusException()
    {
        var order = SubmittedOrder();
        var payment = Payment.Create(order.Id, Money.Create(5.00m), PaymentProviderName.Fake, IdempotencyKey.Create($"order-{order.Id}"), Now);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);

        var sut = new ConfirmPaymentCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _orderPaymentCoordinator, _emailSender, _clock);
        var act = () => sut.Handle(new ConfirmPaymentCommand(payment.Id), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidPaymentStatusException>();
    }

    /// <summary>Regression test for the real Sprint 5.5 finding: CapturePaymentCommand was correct but unreachable because nothing ever produced an Authorized attempt. This proves the manual-capture (two-phase) branch now does.</summary>
    [Fact]
    public async Task ConfirmPayment_GatewayRequiresCapture_AuthorizesOnlyAndLeavesOrderAndPaymentUnresolved()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _paymentGateway.GetStatusAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(RequiresCapture());

        var sut = new ConfirmPaymentCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _orderPaymentCoordinator, _emailSender, _clock);
        var dto = await sut.Handle(new ConfirmPaymentCommand(payment.Id), CancellationToken.None);

        payment.CurrentAttempt!.Status.Should().Be(PaymentAttemptStatus.Authorized);
        payment.Status.Should().Be(PaymentStatus.Processing);
        dto.Status.Should().Be("processing");
        await _orderPaymentCoordinator.DidNotReceiveWithAnyArgs().OnPaymentSucceededAsync(default, default, default);
        await _emailSender.DidNotReceiveWithAnyArgs().SendOrderConfirmationAsync(default!, default!, default, default);
    }

    [Fact]
    public async Task ConfirmPayment_RequiresCaptureCalledTwice_SecondCallIsIdempotentNotAnException()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _paymentGateway.GetStatusAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(RequiresCapture());

        var sut = new ConfirmPaymentCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _orderPaymentCoordinator, _emailSender, _clock);
        await sut.Handle(new ConfirmPaymentCommand(payment.Id), CancellationToken.None);
        var act = () => sut.Handle(new ConfirmPaymentCommand(payment.Id), CancellationToken.None);

        await act.Should().NotThrowAsync();
        payment.CurrentAttempt!.Status.Should().Be(PaymentAttemptStatus.Authorized);
    }

    // ---- ProcessPaymentWebhookCommand ----

    [Fact]
    public async Task ProcessWebhook_InvalidSignature_ThrowsAndNeverTouchesAPayment()
    {
        _paymentGateway.TryParseWebhook(Arg.Any<string>(), Arg.Any<string>()).Returns((ParsedWebhookEvent?)null);

        var sut = new ProcessPaymentWebhookCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _idempotencyStore, _orderPaymentCoordinator, _emailSender, _clock, Microsoft.Extensions.Logging.Abstractions.NullLogger<ProcessPaymentWebhookCommandHandler>.Instance);
        var act = () => sut.Handle(new ProcessPaymentWebhookCommand("bad-payload", "bad-sig"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidWebhookSignatureException>();
        await _idempotencyStore.DidNotReceiveWithAnyArgs().TryReserveAsync(default!, default);
    }

    [Fact]
    public async Task ProcessWebhook_ReplayedEventId_IsSafeNoOpAndNeverTouchesThePayment()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        var parsed = new ParsedWebhookEvent("evt_1", "payment_intent.succeeded", payment.CurrentAttempt!.ProviderReference!.Value, order.Id, Success());
        _paymentGateway.TryParseWebhook(Arg.Any<string>(), Arg.Any<string>()).Returns(parsed);
        _idempotencyStore.TryReserveAsync("evt_1", Arg.Any<CancellationToken>()).Returns(false);

        var sut = new ProcessPaymentWebhookCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _idempotencyStore, _orderPaymentCoordinator, _emailSender, _clock, Microsoft.Extensions.Logging.Abstractions.NullLogger<ProcessPaymentWebhookCommandHandler>.Instance);
        await sut.Handle(new ProcessPaymentWebhookCommand("payload", "sig"), CancellationToken.None);

        await _paymentRepository.DidNotReceiveWithAnyArgs().GetByOrderIdAsync(default, default);
        payment.Status.Should().Be(PaymentStatus.Processing);
    }

    [Fact]
    public async Task ProcessWebhook_StaleAttemptReference_IsSafeNoOpNeverAppliedAgainstTheWrongAttempt()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id, reference: "fake_pi_stale");
        // A retry started a new attempt after this webhook's intent was created.
        payment.DeclineAttempt(payment.CurrentAttempt!.Id, PaymentFailure.Create("card_declined", "declined"), Now);
        payment.StartAttempt(PaymentProviderReference.Create("fake_pi_current"), Now);

        var parsed = new ParsedWebhookEvent("evt_2", "payment_intent.succeeded", "fake_pi_stale", order.Id, Success());
        _paymentGateway.TryParseWebhook(Arg.Any<string>(), Arg.Any<string>()).Returns(parsed);
        _idempotencyStore.TryReserveAsync("evt_2", Arg.Any<CancellationToken>()).Returns(true);
        _paymentRepository.GetByOrderIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(payment);

        var sut = new ProcessPaymentWebhookCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _idempotencyStore, _orderPaymentCoordinator, _emailSender, _clock, Microsoft.Extensions.Logging.Abstractions.NullLogger<ProcessPaymentWebhookCommandHandler>.Instance);
        await sut.Handle(new ProcessPaymentWebhookCommand("payload", "sig"), CancellationToken.None);

        payment.CurrentAttempt!.Status.Should().Be(PaymentAttemptStatus.Started);
        await _orderPaymentCoordinator.DidNotReceiveWithAnyArgs().OnPaymentSucceededAsync(default, default, default);
    }

    [Fact]
    public async Task ProcessWebhook_ValidNewSucceededEvent_CapturesAndMarksOrderPaid()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        var parsed = new ParsedWebhookEvent("evt_3", "payment_intent.succeeded", payment.CurrentAttempt!.ProviderReference!.Value, order.Id, Success());
        _paymentGateway.TryParseWebhook(Arg.Any<string>(), Arg.Any<string>()).Returns(parsed);
        _idempotencyStore.TryReserveAsync("evt_3", Arg.Any<CancellationToken>()).Returns(true);
        _paymentRepository.GetByOrderIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);

        var sut = new ProcessPaymentWebhookCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _idempotencyStore, _orderPaymentCoordinator, _emailSender, _clock, Microsoft.Extensions.Logging.Abstractions.NullLogger<ProcessPaymentWebhookCommandHandler>.Instance);
        await sut.Handle(new ProcessPaymentWebhookCommand("payload", "sig"), CancellationToken.None);

        payment.Status.Should().Be(PaymentStatus.Succeeded);
        await _orderPaymentCoordinator.Received(1).OnPaymentSucceededAsync(order.Id, Now, Arg.Any<CancellationToken>());
    }

    /// <summary>
    /// Regression test for a real Sprint 5.5 gap: this command's own doc comment claims "the
    /// browser closed right after confirming is recoverable" via this webhook path, but nothing
    /// sent the confirmation email if the webhook (not ConfirmPaymentCommand) was what actually
    /// resolved the payment — so that claim wasn't true until this was added.
    /// </summary>
    [Fact]
    public async Task ProcessWebhook_ValidNewSucceededEvent_SendsTheOrderConfirmationEmail()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        var parsed = new ParsedWebhookEvent("evt_5", "payment_intent.succeeded", payment.CurrentAttempt!.ProviderReference!.Value, order.Id, Success());
        _paymentGateway.TryParseWebhook(Arg.Any<string>(), Arg.Any<string>()).Returns(parsed);
        _idempotencyStore.TryReserveAsync("evt_5", Arg.Any<CancellationToken>()).Returns(true);
        _paymentRepository.GetByOrderIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);

        var sut = new ProcessPaymentWebhookCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _idempotencyStore, _orderPaymentCoordinator, _emailSender, _clock, Microsoft.Extensions.Logging.Abstractions.NullLogger<ProcessPaymentWebhookCommandHandler>.Instance);
        await sut.Handle(new ProcessPaymentWebhookCommand("payload", "sig"), CancellationToken.None);

        await _emailSender.Received(1).SendOrderConfirmationAsync(order.GuestInfo!.Email, order.OrderNumber.Value, order.Totals.Total.Amount, Arg.Any<CancellationToken>());
    }

    /// <summary>
    /// Regression test for a real, previously-undisclosed gap found on review: CancelPaymentCommand
    /// only ever cancels a Payment locally — IPaymentGateway has no cancel/void call at all — so a
    /// charge that was genuinely still in flight at the gateway when a customer/staff cancelled
    /// locally can still succeed for real afterward. Before this fix that later "succeeded" webhook
    /// vanished into the same safe-no-op path as an ordinary already-resolved event, with nothing to
    /// distinguish "resolved by ConfirmPaymentCommand" (fine) from "money moved after we told the
    /// customer it didn't" (not fine). This only proves it now logs loudly and still never mutates
    /// state off a Cancelled payment — a full gateway-level void is a larger change deliberately not
    /// attempted here without the ability to compile/verify against the real Stripe SDK.
    /// </summary>
    [Fact]
    public async Task ProcessWebhook_SucceededEventArrivesAfterLocalCancellation_LogsTheAnomalyAndStaysASafeNoOp()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        var reference = payment.CurrentAttempt!.ProviderReference!.Value;
        payment.Cancel(Now); // What CancelPaymentCommand itself does — a purely local cancellation.
        var parsed = new ParsedWebhookEvent("evt_6", "payment_intent.succeeded", reference, order.Id, Success());
        _paymentGateway.TryParseWebhook(Arg.Any<string>(), Arg.Any<string>()).Returns(parsed);
        _idempotencyStore.TryReserveAsync("evt_6", Arg.Any<CancellationToken>()).Returns(true);
        _paymentRepository.GetByOrderIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(payment);
        // A hand-written recorder, not an NSubstitute proxy — NSubstitute can't generate a proxy
        // for ILogger<T> closed over this internal handler type (Castle's dynamic-proxy assembly
        // needs InternalsVisibleTo for a strong-named target, which Microsoft.Extensions.Logging.Abstractions
        // is); a real, compiled class sidesteps that constraint entirely while still letting this
        // test assert on what was actually logged.
        var logger = new RecordingLogger<ProcessPaymentWebhookCommandHandler>();

        var sut = new ProcessPaymentWebhookCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _idempotencyStore, _orderPaymentCoordinator, _emailSender, _clock, logger);
        await sut.Handle(new ProcessPaymentWebhookCommand("payload", "sig"), CancellationToken.None);

        payment.Status.Should().Be(PaymentStatus.Cancelled);
        await _orderPaymentCoordinator.DidNotReceiveWithAnyArgs().OnPaymentSucceededAsync(default, default, default);
        logger.Entries.Should().ContainSingle(e => e.Level == Microsoft.Extensions.Logging.LogLevel.Error && e.Message.Contains(payment.Id.ToString()));
    }

    /// <summary>A real, compiled <see cref="Microsoft.Extensions.Logging.ILogger{TCategoryName}"/> test double — see its own call site's comment for why this exists instead of an NSubstitute proxy.</summary>
    private sealed class RecordingLogger<T> : Microsoft.Extensions.Logging.ILogger<T>
    {
        public List<(Microsoft.Extensions.Logging.LogLevel Level, string Message)> Entries { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(Microsoft.Extensions.Logging.LogLevel logLevel) => true;

        public void Log<TState>(Microsoft.Extensions.Logging.LogLevel logLevel, Microsoft.Extensions.Logging.EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Entries.Add((logLevel, formatter(state, exception)));
    }

    [Fact]
    public async Task ProcessWebhook_AlreadyResolvedByConfirmPath_IsSafeNoOpAndNeverReAppliesTheOutcome()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        payment.CaptureAttempt(payment.CurrentAttempt!.Id, null, Now); // ConfirmPaymentCommand already won the race.
        var parsed = new ParsedWebhookEvent("evt_4", "payment_intent.succeeded", payment.CurrentAttempt!.ProviderReference!.Value, order.Id, Success());
        _paymentGateway.TryParseWebhook(Arg.Any<string>(), Arg.Any<string>()).Returns(parsed);
        _idempotencyStore.TryReserveAsync("evt_4", Arg.Any<CancellationToken>()).Returns(true);
        _paymentRepository.GetByOrderIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(payment);

        var sut = new ProcessPaymentWebhookCommandHandler(_paymentRepository, _orderRepository, _userRepository, _paymentGateway, _idempotencyStore, _orderPaymentCoordinator, _emailSender, _clock, Microsoft.Extensions.Logging.Abstractions.NullLogger<ProcessPaymentWebhookCommandHandler>.Instance);
        await sut.Handle(new ProcessPaymentWebhookCommand("payload", "sig"), CancellationToken.None);

        await _orderPaymentCoordinator.DidNotReceiveWithAnyArgs().OnPaymentSucceededAsync(default, default, default);
    }

    // ---- CapturePaymentCommand ----

    [Fact]
    public async Task CapturePayment_AttemptNotAuthorized_ThrowsInvalidPaymentStatusException()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id); // Started, never authorized.
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);

        var sut = new CapturePaymentCommandHandler(_paymentRepository, _orderRepository, _paymentGateway, _orderPaymentCoordinator, _clock);
        var act = () => sut.Handle(new CapturePaymentCommand(payment.Id), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidPaymentStatusException>();
    }

    [Fact]
    public async Task CapturePayment_AuthorizedAttempt_CapturesAndMarksOrderPaid()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        payment.AuthorizeAttempt(payment.CurrentAttempt!.Id, Now);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _paymentGateway.CaptureAsync(payment.CurrentAttempt!.ProviderReference!.Value, Arg.Any<CancellationToken>()).Returns(Success());

        var sut = new CapturePaymentCommandHandler(_paymentRepository, _orderRepository, _paymentGateway, _orderPaymentCoordinator, _clock);
        var dto = await sut.Handle(new CapturePaymentCommand(payment.Id), CancellationToken.None);

        dto.Status.Should().Be("succeeded");
        await _orderPaymentCoordinator.Received(1).OnPaymentSucceededAsync(order.Id, Now, Arg.Any<CancellationToken>());
    }

    // ---- CancelPaymentCommand ----

    [Fact]
    public async Task CancelPayment_GuestOrder_IsAllowedAndAbandonsTheOrder()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _currentUserService.UserId.Returns((Guid?)null);
        _currentUserService.Permissions.Returns((IReadOnlyCollection<string>)[]);

        var sut = new CancelPaymentCommandHandler(_paymentRepository, _orderRepository, _orderPaymentCoordinator, _currentUserService, _clock);
        await sut.Handle(new CancelPaymentCommand(payment.Id, "changed my mind"), CancellationToken.None);

        payment.Status.Should().Be(PaymentStatus.Cancelled);
        await _orderPaymentCoordinator.Received(1).OnPaymentAbandonedAsync(order.Id, "changed my mind", Now, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CancelPayment_AuthenticatedNonOwnerNonStaffOnACustomerOrder_ThrowsPaymentNotFoundException()
    {
        var order = Order.Create(OrderNumber.FromSequenceValue(4), Guid.NewGuid(), null, FulfillmentMethod.Pickup, Now);
        order.AddItem(Guid.NewGuid(), "Cappuccino", "ESP-001", RecipeSelection.Create("cream", "medium", "kraft", "classic", "classic", "glossy", []), Money.Create(5.00m), 1, null);
        order.Submit(Now);
        var payment = ProcessingPayment(order.Id);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _currentUserService.UserId.Returns(Guid.NewGuid());
        _currentUserService.Permissions.Returns((IReadOnlyCollection<string>)[]);

        var sut = new CancelPaymentCommandHandler(_paymentRepository, _orderRepository, _orderPaymentCoordinator, _currentUserService, _clock);
        var act = () => sut.Handle(new CancelPaymentCommand(payment.Id, null), CancellationToken.None);

        await act.Should().ThrowAsync<PaymentNotFoundException>();
    }

    [Fact]
    public async Task CancelPayment_Staff_IsAllowedEvenWithoutOwningTheOrder()
    {
        var order = Order.Create(OrderNumber.FromSequenceValue(5), Guid.NewGuid(), null, FulfillmentMethod.Pickup, Now);
        order.AddItem(Guid.NewGuid(), "Cappuccino", "ESP-001", RecipeSelection.Create("cream", "medium", "kraft", "classic", "classic", "glossy", []), Money.Create(5.00m), 1, null);
        order.Submit(Now);
        var payment = ProcessingPayment(order.Id);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _currentUserService.UserId.Returns(Guid.NewGuid());
        _currentUserService.Permissions.Returns((IReadOnlyCollection<string>)[PermissionCodes.UpdateOrderStatus]);

        var sut = new CancelPaymentCommandHandler(_paymentRepository, _orderRepository, _orderPaymentCoordinator, _currentUserService, _clock);
        var act = () => sut.Handle(new CancelPaymentCommand(payment.Id, null), CancellationToken.None);

        await act.Should().NotThrowAsync();
    }

    // ---- RefundPaymentCommand ----

    [Fact]
    public async Task RefundPayment_NoCapturedAttempt_ThrowsInvalidPaymentStatusException()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id); // Never captured.
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);

        var sut = new RefundPaymentCommandHandler(_paymentRepository, _orderRepository, _paymentGateway, _clock);
        var act = () => sut.Handle(new RefundPaymentCommand(payment.Id, null, "requested"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidPaymentStatusException>();
    }

    [Fact]
    public async Task RefundPayment_GatewayRejects_ThrowsInvalidRefundAmountExceptionAndNeverMutatesThePayment()
    {
        var order = SubmittedOrder();
        var payment = ProcessingPayment(order.Id);
        payment.CaptureAttempt(payment.CurrentAttempt!.Id, null, Now);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _paymentGateway.RefundAsync(Arg.Any<string>(), Arg.Any<decimal>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new RefundOutcome(false, null, "gateway declined the refund"));

        var sut = new RefundPaymentCommandHandler(_paymentRepository, _orderRepository, _paymentGateway, _clock);
        var act = () => sut.Handle(new RefundPaymentCommand(payment.Id, null, "requested"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidRefundAmountException>();
        payment.Status.Should().Be(PaymentStatus.Succeeded);
        payment.RefundedAmount.Amount.Should().Be(0);
    }

    [Fact]
    public async Task RefundPayment_NoAmountSpecified_RefundsTheFullRemainingBalanceAndNeverTouchesOrderStatus()
    {
        var order = SubmittedOrder(5.00m);
        var payment = ProcessingPayment(order.Id, 5.00m);
        payment.CaptureAttempt(payment.CurrentAttempt!.Id, null, Now);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _paymentGateway.RefundAsync(payment.CurrentAttempt!.ProviderReference!.Value, 5.00m, "USD", Arg.Any<CancellationToken>())
            .Returns(new RefundOutcome(true, "fake_re_1", null));

        var sut = new RefundPaymentCommandHandler(_paymentRepository, _orderRepository, _paymentGateway, _clock);
        var dto = await sut.Handle(new RefundPaymentCommand(payment.Id, null, "requested"), CancellationToken.None);

        dto.Status.Should().Be("refunded");
        payment.RefundedAmount.Amount.Should().Be(5.00m);
    }

    /// <summary>Regression test for a real bug found on review: requesting a refund larger than what remains must be rejected before ever calling the real gateway. Previously the gateway call happened first and only Payment.Refund's own domain check caught an over-refund afterward — a real gateway refund could have processed before the local guard fired, leaving the gateway out of sync with a rolled-back local transaction.</summary>
    [Fact]
    public async Task RefundPayment_AmountExceedsRemaining_ThrowsBeforeEverCallingTheGateway()
    {
        var order = SubmittedOrder(5.00m);
        var payment = ProcessingPayment(order.Id, 5.00m);
        payment.CaptureAttempt(payment.CurrentAttempt!.Id, null, Now);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);

        var sut = new RefundPaymentCommandHandler(_paymentRepository, _orderRepository, _paymentGateway, _clock);
        var act = () => sut.Handle(new RefundPaymentCommand(payment.Id, 10.00m, "requested"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidRefundAmountException>();
        await _paymentGateway.DidNotReceive().RefundAsync(Arg.Any<string>(), Arg.Any<decimal>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
        payment.RefundedAmount.Amount.Should().Be(0);
    }

    /// <summary>Regression test: a payment that's already fully Refunded must reject a second refund attempt before the gateway is ever touched, not just when there happens to be no captured attempt left to find.</summary>
    [Fact]
    public async Task RefundPayment_AlreadyFullyRefunded_ThrowsInvalidPaymentStatusExceptionBeforeEverCallingTheGateway()
    {
        var order = SubmittedOrder(5.00m);
        var payment = ProcessingPayment(order.Id, 5.00m);
        payment.CaptureAttempt(payment.CurrentAttempt!.Id, null, Now);
        payment.Refund(Money.Create(5.00m), "requested", Now);
        payment.Status.Should().Be(PaymentStatus.Refunded);
        _paymentRepository.GetByIdAsync(payment.Id, Arg.Any<CancellationToken>()).Returns(payment);

        var sut = new RefundPaymentCommandHandler(_paymentRepository, _orderRepository, _paymentGateway, _clock);
        var act = () => sut.Handle(new RefundPaymentCommand(payment.Id, null, "requested again"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidPaymentStatusException>();
        await _paymentGateway.DidNotReceive().RefundAsync(Arg.Any<string>(), Arg.Any<decimal>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }
}
