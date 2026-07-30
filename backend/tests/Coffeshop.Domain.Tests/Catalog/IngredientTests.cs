using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Catalog.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Coffeshop.Domain.Tests.Catalog;

public sealed class IngredientTests
{
    [Fact]
    public void IsCompatibleWith_UniversallyCompatible_TrueForAnyCategory()
    {
        var syrup = Ingredient.Create("syrup", "Vanilla Syrup", Guid.NewGuid(), Money.Create(0.5m), [], true, "#fff", IngredientShape.Ring, 0);

        syrup.IsCompatibleWith("espresso").Should().BeTrue();
        syrup.IsCompatibleWith("tea").Should().BeTrue();
    }

    [Fact]
    public void IsCompatibleWith_SpecificList_TrueOnlyForListedCategories()
    {
        var ice = Ingredient.Create("ice", "Ice Cubes", Guid.NewGuid(), Money.Zero(), ["cold-brew"], false, "#dceef5", IngredientShape.Ice, 0);

        ice.IsCompatibleWith("cold-brew").Should().BeTrue();
        ice.IsCompatibleWith("espresso").Should().BeFalse();
    }

    [Fact]
    public void UpdateCompatibility_ReplacesThePreviousList()
    {
        var ingredient = Ingredient.Create("foam", "Extra Foam", Guid.NewGuid(), Money.Create(0.5m), ["espresso"], false, "#fff", IngredientShape.Ring, 0);

        ingredient.UpdateCompatibility(["tea"], false);

        ingredient.IsCompatibleWith("espresso").Should().BeFalse();
        ingredient.IsCompatibleWith("tea").Should().BeTrue();
    }

    [Fact]
    public void Create_DeduplicatesCompatibleCategoryCodes()
    {
        var ingredient = Ingredient.Create("foam", "Extra Foam", Guid.NewGuid(), Money.Create(0.5m), ["espresso", "espresso", "ESPRESSO"], false, "#fff", IngredientShape.Ring, 0);

        ingredient.CompatibleCategoryCodes.Should().ContainSingle();
    }
}

public sealed class CategoryTests
{
    [Fact]
    public void Create_NormalizesCodeToLowercase()
    {
        Category.Create("ESPRESSO", "Espresso", 0).Code.Should().Be("espresso");
    }

    [Fact]
    public void Rename_UpdatesNameAndSortOrder()
    {
        var category = Category.Create("espresso", "Espresso", 0);

        category.Rename("Espresso Drinks", 5);

        category.Name.Should().Be("Espresso Drinks");
        category.SortOrder.Should().Be(5);
    }
}
