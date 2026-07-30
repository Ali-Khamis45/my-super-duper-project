using Coffeshop.Domain.Catalog.ValueObjects;
using Coffeshop.Domain.Ordering.Exceptions;
using Coffeshop.Domain.Ordering.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Coffeshop.Domain.Tests.Ordering;

public sealed class OrderNumberTests
{
    [Fact]
    public void FromSequenceValue_FormatsWithPrefixAndPadding()
    {
        OrderNumber.FromSequenceValue(42).Value.Should().Be("CS-000042");
    }

    [Fact]
    public void FromSequenceValue_NonPositive_ThrowsInvalidOrderNumberException()
    {
        var act = () => OrderNumber.FromSequenceValue(0);

        act.Should().Throw<InvalidOrderNumberException>();
    }

    [Fact]
    public void Parse_ValidValue_RoundTrips()
    {
        OrderNumber.Parse("CS-000042").Value.Should().Be("CS-000042");
    }

    [Fact]
    public void Parse_MissingPrefix_ThrowsInvalidOrderNumberException()
    {
        var act = () => OrderNumber.Parse("000042");

        act.Should().Throw<InvalidOrderNumberException>();
    }
}

public sealed class GuestOrderInfoTests
{
    [Fact]
    public void Create_ValidNameAndEmail_Succeeds()
    {
        var info = GuestOrderInfo.Create("Ada Lovelace", "Ada@Example.com");

        info.Name.Should().Be("Ada Lovelace");
        info.Email.Should().Be("ada@example.com");
    }

    [Fact]
    public void Create_EmptyName_ThrowsInvalidGuestOrderInfoException()
    {
        var act = () => GuestOrderInfo.Create("", "ada@example.com");

        act.Should().Throw<InvalidGuestOrderInfoException>();
    }

    [Fact]
    public void Create_EmailWithoutAtSign_ThrowsInvalidGuestOrderInfoException()
    {
        var act = () => GuestOrderInfo.Create("Ada", "not-an-email");

        act.Should().Throw<InvalidGuestOrderInfoException>();
    }

    [Theory]
    [InlineData("ada@")]
    [InlineData("@example.com")]
    [InlineData("ada@example")]
    public void Create_EmailContainingAtSignButNotActuallyValid_ThrowsInvalidGuestOrderInfoException(string malformedEmail)
    {
        // Phase 10 regression test — a real validation hole this sprint's own adversarial review
        // found: the original check was just `email.Contains('@')`, which every one of these
        // would have wrongly passed. Reuses Identity's own already-proven `Email` value object
        // now instead of a weaker, re-derived check.
        var act = () => GuestOrderInfo.Create("Ada", malformedEmail);

        act.Should().Throw<InvalidGuestOrderInfoException>();
    }
}

public sealed class RecipeSelectionTests
{
    [Fact]
    public void Create_ValidSelection_Succeeds()
    {
        var selection = RecipeSelection.Create("cream", "medium", "kraft", "classic", "classic", "glossy", [new RecipeIngredientPlacement("syrup", 1)]);

        selection.Ingredients.Should().ContainSingle(i => i.IngredientId == "syrup" && i.Quantity == 1);
    }

    [Fact]
    public void Create_MissingCosmeticField_ThrowsInvalidRecipeSelectionException()
    {
        var act = () => RecipeSelection.Create("", "medium", "kraft", "classic", "classic", "glossy", []);

        act.Should().Throw<InvalidRecipeSelectionException>();
    }

    [Fact]
    public void Create_NonPositiveIngredientQuantity_ThrowsInvalidRecipeSelectionException()
    {
        var act = () => RecipeSelection.Create("cream", "medium", "kraft", "classic", "classic", "glossy", [new RecipeIngredientPlacement("syrup", 0)]);

        act.Should().Throw<InvalidRecipeSelectionException>();
    }
}

public sealed class OrderTotalsTests
{
    [Fact]
    public void FromLineTotals_Empty_IsZero()
    {
        OrderTotals.FromLineTotals([]).Total.Amount.Should().Be(0);
    }

    [Fact]
    public void FromLineTotals_SumsEveryLine()
    {
        var totals = OrderTotals.FromLineTotals([Money.Create(3.50m), Money.Create(5.00m)]);

        totals.Subtotal.Amount.Should().Be(8.50m);
        totals.Total.Amount.Should().Be(8.50m);
    }
}

public sealed class MoneyMultiplicationTests
{
    [Fact]
    public void MultiplyByQuantity_ReturnsScaledMoney()
    {
        (Money.Create(3.50m) * 3).Amount.Should().Be(10.50m);
    }
}
