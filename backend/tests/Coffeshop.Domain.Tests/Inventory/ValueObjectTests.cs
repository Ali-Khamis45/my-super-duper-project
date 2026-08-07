using Coffeshop.Domain.Inventory.Exceptions;
using Coffeshop.Domain.Inventory.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Coffeshop.Domain.Tests.Inventory;

public sealed class QuantityTests
{
    [Fact]
    public void Create_Positive_Succeeds()
    {
        Quantity.Create(5).Value.Should().Be(5);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Create_ZeroOrNegative_ThrowsInvalidQuantityException(int value)
    {
        var act = () => Quantity.Create(value);
        act.Should().Throw<InvalidQuantityException>();
    }

    [Fact]
    public void Equality_SameValue_AreEqual()
    {
        Quantity.Create(3).Should().Be(Quantity.Create(3));
    }
}

public sealed class StockLevelTests
{
    [Fact]
    public void Create_Zero_Succeeds()
    {
        StockLevel.Create(0).Value.Should().Be(0);
    }

    [Fact]
    public void Create_Negative_ThrowsNegativeStockException()
    {
        var act = () => StockLevel.Create(-1);
        act.Should().Throw<NegativeStockException>();
    }

    [Fact]
    public void Subtract_ExceedingBalance_ThrowsNegativeStockException()
    {
        var level = StockLevel.Create(3);
        var act = () => level.Subtract(Quantity.Create(4));
        act.Should().Throw<NegativeStockException>();
    }

    [Fact]
    public void Subtract_ExactBalance_ResultsInZero()
    {
        var level = StockLevel.Create(3).Subtract(Quantity.Create(3));
        level.Value.Should().Be(0);
    }

    [Fact]
    public void IsSufficientFor_ExactAmount_ReturnsTrue()
    {
        StockLevel.Create(5).IsSufficientFor(Quantity.Create(5)).Should().BeTrue();
    }

    [Fact]
    public void IsSufficientFor_MoreThanAvailable_ReturnsFalse()
    {
        StockLevel.Create(5).IsSufficientFor(Quantity.Create(6)).Should().BeFalse();
    }
}

public sealed class LowStockPolicyTests
{
    [Fact]
    public void IsLow_AtOrBelowThreshold_ReturnsTrue()
    {
        var policy = LowStockPolicy.Create(5);
        policy.IsLow(5).Should().BeTrue();
        policy.IsLow(3).Should().BeTrue();
    }

    [Fact]
    public void IsLow_AboveThreshold_ReturnsFalse()
    {
        LowStockPolicy.Create(5).IsLow(6).Should().BeFalse();
    }

    [Fact]
    public void Create_NegativeThreshold_ThrowsInvalidLowStockPolicyException()
    {
        var act = () => LowStockPolicy.Create(-1);
        act.Should().Throw<InvalidLowStockPolicyException>();
    }

    [Fact]
    public void Default_HasARealNonZeroThreshold()
    {
        LowStockPolicy.Default().Threshold.Should().Be(5);
    }
}
