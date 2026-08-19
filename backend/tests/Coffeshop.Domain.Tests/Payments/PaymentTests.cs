using Coffeshop.Domain.Catalog.ValueObjects;
using Coffeshop.Domain.Payments;
using Coffeshop.Domain.Payments.Events;
using Coffeshop.Domain.Payments.Exceptions;
using Coffeshop.Domain.Payments.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Coffeshop.Domain.Tests.Payments;

public sealed class PaymentTests
{
    private static readonly DateTimeOffset Now = new(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
    private static readonly Guid OrderId = Guid.NewGuid();

    private static Payment NewPayment(decimal amount = 10.00m) =>
        Payment.Create(OrderId, Money.Create(amount), PaymentProviderName.Fake, IdempotencyKey.Create("idem-key-1"), Now);

    private static PaymentProviderReference Ref(string value = "pi_123") => PaymentProviderReference.Create(value);

    [Fact]
    public void Create_SetsInitialState()
    {
        var payment = NewPayment(10.00m);

        payment.OrderId.Should().Be(OrderId);
        payment.Amount.Amount.Should().Be(10.00m);
        payment.Status.Should().Be(PaymentStatus.Pending);
        payment.RefundedAmount.Amount.Should().Be(0m);
        payment.Attempts.Should().BeEmpty();
        payment.CurrentAttempt.Should().BeNull();
    }

    [Fact]
    public void StartAttempt_FirstAttempt_RaisesPaymentStartedEventNotRetry()
    {
        var payment = NewPayment();

        var attempt = payment.StartAttempt(Ref(), Now);

        payment.Status.Should().Be(PaymentStatus.Processing);
        payment.CurrentAttempt.Should().Be(attempt);
        payment.DomainEvents.Should().ContainSingle(e => e is PaymentStartedEvent);
        payment.DomainEvents.Should().NotContain(e => e is PaymentRetryEvent);
    }

    [Fact]
    public void StartAttempt_AfterAPriorDecline_RaisesPaymentRetryEvent()
    {
        var payment = NewPayment();
        var first = payment.StartAttempt(Ref("pi_1"), Now);
        payment.DeclineAttempt(first.Id, PaymentFailure.Create("card_declined", "Your card was declined."), Now);
        payment.ClearDomainEvents();

        var second = payment.StartAttempt(Ref("pi_2"), Now.AddMinutes(1));

        payment.Attempts.Should().HaveCount(2);
        payment.CurrentAttempt.Should().Be(second);
        payment.DomainEvents.Should().ContainSingle(e => e is PaymentRetryEvent && ((PaymentRetryEvent)e).AttemptNumber == 2);
    }

    [Fact]
    public void StartAttempt_WhileAlreadyProcessing_Throws()
    {
        var payment = NewPayment();
        payment.StartAttempt(Ref(), Now);

        var act = () => payment.StartAttempt(Ref("pi_2"), Now);

        act.Should().Throw<InvalidPaymentStatusException>();
    }

    [Fact]
    public void StartAttempt_AfterSucceeded_Throws()
    {
        var payment = NewPayment();
        var attempt = payment.StartAttempt(Ref(), Now);
        payment.CaptureAttempt(attempt.Id, null, Now);

        var act = () => payment.StartAttempt(Ref("pi_2"), Now);

        act.Should().Throw<InvalidPaymentStatusException>();
    }

    [Fact]
    public void CaptureAttempt_MovesPaymentToSucceededAndRaisesCapturedAndReceiptEvents()
    {
        var payment = NewPayment();
        var attempt = payment.StartAttempt(Ref(), Now);
        payment.ClearDomainEvents();

        payment.CaptureAttempt(attempt.Id, PaymentMethod.Create("card", "visa", "4242"), Now);

        payment.Status.Should().Be(PaymentStatus.Succeeded);
        attempt.Status.Should().Be(PaymentAttemptStatus.Captured);
        payment.DomainEvents.Should().ContainSingle(e => e is PaymentCapturedEvent);
        payment.DomainEvents.Should().ContainSingle(e => e is PaymentReceiptCreatedEvent);
    }

    [Fact]
    public void CaptureAttempt_Twice_ThrowsNotADoubleCharge()
    {
        // The frozen sketch's own invariant: "a second capture attempt against an already-captured
        // Payment is a no-op, not a double charge" — enforced here as a real thrown exception
        // (the aggregate refuses, the caller must not proceed), not a silent no-op that could mask
        // a real bug upstream.
        var payment = NewPayment();
        var attempt = payment.StartAttempt(Ref(), Now);
        payment.CaptureAttempt(attempt.Id, null, Now);

        var act = () => payment.CaptureAttempt(attempt.Id, null, Now);

        act.Should().Throw<InvalidPaymentStatusException>();
    }

    [Fact]
    public void DeclineAttempt_ReturnsPaymentToPendingSoARetryCanStart()
    {
        var payment = NewPayment();
        var attempt = payment.StartAttempt(Ref(), Now);
        payment.ClearDomainEvents();

        payment.DeclineAttempt(attempt.Id, PaymentFailure.Create("card_declined", "Your card was declined.", "insufficient_funds"), Now);

        payment.Status.Should().Be(PaymentStatus.Pending, "a single declined attempt must never permanently fail the payment");
        attempt.Status.Should().Be(PaymentAttemptStatus.Declined);
        attempt.Failure!.DeclineCode.Should().Be("insufficient_funds");
        payment.DomainEvents.Should().ContainSingle(e => e is PaymentFailedEvent);
    }

    [Fact]
    public void ErrorAttempt_AlsoReturnsPaymentToPendingAndRaisesProviderErrorEvent()
    {
        var payment = NewPayment();
        var attempt = payment.StartAttempt(Ref(), Now);
        payment.ClearDomainEvents();

        payment.ErrorAttempt(attempt.Id, PaymentFailure.Create("api_error", "Gateway unreachable."), Now);

        payment.Status.Should().Be(PaymentStatus.Pending);
        attempt.Status.Should().Be(PaymentAttemptStatus.Errored);
        payment.DomainEvents.Should().ContainSingle(e => e is PaymentProviderErrorEvent);
        payment.DomainEvents.Should().NotContain(e => e is PaymentFailedEvent, "a provider/gateway error is not a customer decline");
    }

    [Fact]
    public void TimeoutAttempt_ReturnsPaymentToPendingAndRaisesTimeoutEvent()
    {
        var payment = NewPayment();
        var attempt = payment.StartAttempt(Ref(), Now);
        payment.ClearDomainEvents();

        payment.TimeoutAttempt(attempt.Id, Now);

        payment.Status.Should().Be(PaymentStatus.Pending);
        attempt.Status.Should().Be(PaymentAttemptStatus.TimedOut);
        payment.DomainEvents.Should().ContainSingle(e => e is PaymentTimeoutEvent);
    }

    [Fact]
    public void Cancel_FromPending_Succeeds()
    {
        var payment = NewPayment();
        payment.Cancel(Now);
        payment.Status.Should().Be(PaymentStatus.Cancelled);
    }

    [Fact]
    public void Cancel_AfterSucceeded_Throws()
    {
        var payment = NewPayment();
        var attempt = payment.StartAttempt(Ref(), Now);
        payment.CaptureAttempt(attempt.Id, null, Now);

        var act = () => payment.Cancel(Now);

        act.Should().Throw<InvalidPaymentStatusException>();
    }

    [Fact]
    public void Refund_FullAmount_MarksRefundedAndRaisesEventWithIsFullRefundTrue()
    {
        var payment = NewPayment(10.00m);
        var attempt = payment.StartAttempt(Ref(), Now);
        payment.CaptureAttempt(attempt.Id, null, Now);
        payment.ClearDomainEvents();

        payment.Refund(Money.Create(10.00m), "Customer request", Now);

        payment.Status.Should().Be(PaymentStatus.Refunded);
        payment.RefundedAmount.Amount.Should().Be(10.00m);
        payment.DomainEvents.Should().ContainSingle(e => e is PaymentRefundedEvent && ((PaymentRefundedEvent)e).IsFullRefund);
    }

    [Fact]
    public void Refund_PartialAmount_MarksPartiallyRefundedAndAllowsASecondPartialRefund()
    {
        var payment = NewPayment(10.00m);
        var attempt = payment.StartAttempt(Ref(), Now);
        payment.CaptureAttempt(attempt.Id, null, Now);

        payment.Refund(Money.Create(4.00m), "Partial", Now);
        payment.Status.Should().Be(PaymentStatus.PartiallyRefunded);

        payment.Refund(Money.Create(6.00m), "Remainder", Now);
        payment.Status.Should().Be(PaymentStatus.Refunded);
        payment.RefundedAmount.Amount.Should().Be(10.00m);
    }

    [Fact]
    public void Refund_MoreThanRemaining_Throws()
    {
        var payment = NewPayment(10.00m);
        var attempt = payment.StartAttempt(Ref(), Now);
        payment.CaptureAttempt(attempt.Id, null, Now);
        payment.Refund(Money.Create(4.00m), "Partial", Now);

        var act = () => payment.Refund(Money.Create(7.00m), "Too much", Now);

        act.Should().Throw<InvalidRefundAmountException>();
    }

    [Fact]
    public void Refund_BeforeCapture_Throws()
    {
        var payment = NewPayment();

        var act = () => payment.Refund(Money.Create(1.00m), "Too early", Now);

        act.Should().Throw<InvalidPaymentStatusException>();
    }

    [Fact]
    public void RecordWebhookReceived_RaisesWebhookReceivedEvent()
    {
        var payment = NewPayment();
        payment.RecordWebhookReceived("evt_123", "payment_intent.succeeded", Now);

        payment.DomainEvents.Should().ContainSingle(e => e is PaymentWebhookReceivedEvent);
    }
}
