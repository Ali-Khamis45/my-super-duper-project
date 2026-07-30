using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Catalog.ValueObjects;

/// <summary>
/// Every field is optional — this project has no real recipe/lab data to derive exact figures
/// from, and inventing precise-looking numbers would be exactly the kind of fabricated content
/// this project's own AI Barista honesty precedent already rules out. Seeded only where a
/// figure is genuinely well-known (e.g. a shot of espresso's typical caffeine content), left
/// null everywhere else rather than guessed.
/// </summary>
public sealed class NutritionFacts : ValueObject
{
    public int? Calories { get; }

    public int? CaffeineMg { get; }

    public int? SugarGrams { get; }

    private NutritionFacts(int? calories, int? caffeineMg, int? sugarGrams)
    {
        Calories = calories;
        CaffeineMg = caffeineMg;
        SugarGrams = sugarGrams;
    }

    public static NutritionFacts Create(int? calories = null, int? caffeineMg = null, int? sugarGrams = null) =>
        new(calories, caffeineMg, sugarGrams);

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Calories;
        yield return CaffeineMg;
        yield return SugarGrams;
    }
}
