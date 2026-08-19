using Coffeshop.Domain.Payments.Exceptions;
using Coffeshop.Domain.Payments.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Coffeshop.Domain.Tests.Payments;

public sealed class IdempotencyKeyTests
{
    [Fact]
    public void Create_ValidValue_Succeeds()
    {
        IdempotencyKey.Create("checkout-abc-123").Value.Should().Be("checkout-abc-123");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_Blank_Throws(string value)
    {
        var act = () => IdempotencyKey.Create(value);
        act.Should().Throw<InvalidIdempotencyKeyException>();
    }

    [Fact]
    public void Create_TooLong_Throws()
    {
        var act = () => IdempotencyKey.Create(new string('a', IdempotencyKey.MaxLength + 1));
        act.Should().Throw<InvalidIdempotencyKeyException>();
    }

    [Fact]
    public void Equality_SameValue_AreEqual()
    {
        IdempotencyKey.Create("key-1").Should().Be(IdempotencyKey.Create("key-1"));
    }
}

public sealed class PaymentProviderReferenceTests
{
    [Fact]
    public void Create_ValidValue_Succeeds()
    {
        PaymentProviderReference.Create("pi_abc123").Value.Should().Be("pi_abc123");
    }

    [Fact]
    public void Create_Blank_Throws()
    {
        var act = () => PaymentProviderReference.Create(" ");
        act.Should().Throw<InvalidPaymentProviderReferenceException>();
    }
}

public sealed class PaymentFailureTests
{
    [Fact]
    public void Create_CarriesStructuredFields()
    {
        var failure = PaymentFailure.Create("card_declined", "Your card was declined.", "insufficient_funds");

        failure.Code.Should().Be("card_declined");
        failure.Message.Should().Be("Your card was declined.");
        failure.DeclineCode.Should().Be("insufficient_funds");
    }

    [Fact]
    public void Create_NoDeclineCode_DefaultsToNull()
    {
        PaymentFailure.Create("api_error", "Gateway unreachable.").DeclineCode.Should().BeNull();
    }
}

public sealed class PaymentMethodTests
{
    [Fact]
    public void ToString_WithBrandAndLast4_FormatsReadably()
    {
        PaymentMethod.Create("card", "Visa", "4242").ToString().Should().Be("Visa ending in 4242");
    }

    [Fact]
    public void ToString_WithoutBrand_FallsBackToType()
    {
        PaymentMethod.Create("card", null, null).ToString().Should().Be("card");
    }
}
