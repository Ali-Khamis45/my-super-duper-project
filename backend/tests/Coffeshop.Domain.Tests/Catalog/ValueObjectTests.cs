using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Catalog.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Coffeshop.Domain.Tests.Catalog;

public sealed class MoneyTests
{
    [Fact]
    public void Create_NegativeAmount_ThrowsInvalidMoneyException()
    {
        var act = () => Money.Create(-1);

        act.Should().Throw<InvalidMoneyException>();
    }

    [Fact]
    public void Create_RoundsToTwoDecimalPlaces()
    {
        Money.Create(1.005m).Amount.Should().Be(1.00m);
    }

    [Fact]
    public void Add_SameCurrency_Sums()
    {
        (Money.Create(1.50m) + Money.Create(2.25m)).Amount.Should().Be(3.75m);
    }

    [Fact]
    public void Add_DifferentCurrency_Throws()
    {
        var act = () => Money.Create(1, "USD") + Money.Create(1, "EUR");

        act.Should().Throw<InvalidMoneyException>();
    }

    [Fact]
    public void Subtract_NeverGoesNegative()
    {
        (Money.Create(1) - Money.Create(5)).Amount.Should().Be(0);
    }
}

public sealed class PriceTests
{
    [Fact]
    public void Create_ZeroOrNegativeAmount_ThrowsInvalidPriceException()
    {
        var act = () => Price.Create(Money.Zero());

        act.Should().Throw<InvalidPriceException>();
    }

    [Fact]
    public void Create_CompareAtNotGreaterThanAmount_ThrowsInvalidPriceException()
    {
        var act = () => Price.Create(Money.Create(5), Money.Create(5));

        act.Should().Throw<InvalidPriceException>();
    }

    [Fact]
    public void Create_ValidCompareAt_IsOnSale()
    {
        Price.Create(Money.Create(5), Money.Create(10)).IsOnSale.Should().BeTrue();
    }

    [Fact]
    public void Create_NoCompareAt_IsNotOnSale()
    {
        Price.Create(Money.Create(5)).IsOnSale.Should().BeFalse();
    }
}

public sealed class SkuTests
{
    [Theory]
    [InlineData("esp-classic-001", "ESP-CLASSIC-001")]
    [InlineData("  ABC-123  ", "ABC-123")]
    public void Create_NormalizesToUppercaseAndTrims(string input, string expected)
    {
        Sku.Create(input).Value.Should().Be(expected);
    }

    [Theory]
    [InlineData("")]
    [InlineData("ab")]
    [InlineData("has spaces")]
    [InlineData("has_underscore")]
    public void Create_Invalid_ThrowsInvalidSkuException(string input)
    {
        var act = () => Sku.Create(input);

        act.Should().Throw<InvalidSkuException>();
    }
}
