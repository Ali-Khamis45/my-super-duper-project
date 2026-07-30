using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Catalog.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Seed;

/// <summary>
/// Runtime, idempotent seeding — every category/ingredient/product traced directly from the
/// frontend's own static data files (`features/menu/data/{categories,drinks}.ts`,
/// `features/composer/data/ingredients.ts`), per docs/31_COMMERCE_ENGINEERING_CONTRACTS.md's
/// seed data strategy: the exact same 4 categories, 9 ingredients, and 14 drinks, imported
/// once, not re-typed or invented. `ProductVariant`s are seeded at a real, honest $0.00
/// adjustment (the frontend has no size-based pricing today — see `ProductVariant`'s own doc
/// comment) — not fabricated numbers.
/// </summary>
public static class CatalogSeeder
{
    public static async Task SeedAsync(CoffeshopDbContext context, CancellationToken ct = default)
    {
        if (!await context.Categories.AnyAsync(ct))
        {
            context.Categories.AddRange(
                Category.Create("espresso", "Espresso", 0),
                Category.Create("cold-brew", "Cold Brew", 1),
                Category.Create("seasonal", "Seasonal", 2),
                Category.Create("tea", "Tea", 3));

            await context.SaveChangesAsync(ct);
        }

        if (!await context.IngredientCategories.AnyAsync(ct))
        {
            context.IngredientCategories.AddRange(
                IngredientCategory.Create("foam", "Foam"),
                IngredientCategory.Create("cream", "Cream"),
                IngredientCategory.Create("chocolate", "Chocolate"),
                IngredientCategory.Create("caramel", "Caramel"),
                IngredientCategory.Create("cinnamon", "Cinnamon"),
                IngredientCategory.Create("sprinkles", "Sprinkles"),
                IngredientCategory.Create("ice", "Ice"),
                IngredientCategory.Create("milk", "Milk"),
                IngredientCategory.Create("syrup", "Syrup"));

            await context.SaveChangesAsync(ct);
        }

        if (!await context.Ingredients.AnyAsync(ct))
        {
            var ingredientCategoriesByCode = await context.IngredientCategories.ToDictionaryAsync(c => c.Code, c => c.Id, ct);

            Guid CategoryId(string code) => ingredientCategoriesByCode[code];

            context.Ingredients.AddRange(
                Ingredient.Create("foam", "Extra Foam", CategoryId("foam"), Money.Create(0.50m),
                    ["espresso", "seasonal"], false, "#f5ede1", IngredientShape.Ring, 0),
                Ingredient.Create("cream", "Whipped Cream", CategoryId("cream"), Money.Create(0.75m),
                    ["espresso", "cold-brew", "seasonal"], false, "#fbf6ee", IngredientShape.Ring, 1),
                Ingredient.Create("chocolate", "Chocolate Drizzle", CategoryId("chocolate"), Money.Create(0.60m),
                    ["espresso", "seasonal"], false, "#4a2c1d", IngredientShape.Ring, 2),
                Ingredient.Create("caramel", "Caramel Drizzle", CategoryId("caramel"), Money.Create(0.60m),
                    ["espresso", "cold-brew", "seasonal"], false, "#b6742f", IngredientShape.Ring, 3),
                Ingredient.Create("cinnamon", "Cinnamon Dust", CategoryId("cinnamon"), Money.Create(0.30m),
                    ["espresso", "seasonal", "tea"], false, "#8a5a35", IngredientShape.Ring, 4),
                Ingredient.Create("sprinkles", "Sprinkles", CategoryId("sprinkles"), Money.Create(0.40m),
                    ["espresso", "seasonal"], false, "transparent", IngredientShape.Sprinkles, 5),
                Ingredient.Create("ice", "Ice Cubes", CategoryId("ice"), Money.Create(0m),
                    ["cold-brew"], false, "#dceef5", IngredientShape.Ice, 6),
                Ingredient.Create("milk", "Steamed Milk", CategoryId("milk"), Money.Create(0.50m),
                    ["espresso", "tea", "seasonal"], false, "#f5ede1", IngredientShape.Ring, 7),
                Ingredient.Create("syrup", "Vanilla Syrup", CategoryId("syrup"), Money.Create(0.50m),
                    [], true, "#e0a95c", IngredientShape.Ring, 8));

            await context.SaveChangesAsync(ct);
        }

        if (!await context.Products.AnyAsync(ct))
        {
            var categoriesByCode = await context.Categories.ToDictionaryAsync(c => c.Code, c => c.Id, ct);

            Guid CategoryId(string code) => categoriesByCode[code];

            var products = new[]
            {
                CreateProduct("ESP-CLASSIC-001", "Classic Espresso", CategoryId("espresso"), 3.50m,
                    "A double shot, pulled slow, poured proud.",
                    "Our house blend, pulled as a true double shot — no shortcuts, no rushing. The base every other drink on this menu is built from.",
                    ["strong", "no milk"], Season.AllYear, Temperature.Hot, caffeineMg: 63),
                CreateProduct("ESP-CAPPUCCINO-002", "Cappuccino", CategoryId("espresso"), 4.50m,
                    "Equal parts bold and cloud-soft.",
                    "Espresso, steamed milk, and a generous cap of microfoam in exact thirds — the ratio the drink was named for, still worth getting right.",
                    ["classic", "foam"], Season.AllYear, Temperature.Hot, caffeineMg: 63),
                CreateProduct("ESP-FLATWHITE-003", "Flat White", CategoryId("espresso"), 4.75m,
                    "Velvet microfoam, no drama.",
                    "A double ristretto under a thin layer of silky, barely-there foam. Smaller than a latte, stronger, and quietly the favorite behind the counter.",
                    ["smooth", "strong"], Season.AllYear, Temperature.Hot, caffeineMg: 130),
                CreateProduct("ESP-CARAMELMAC-004", "Caramel Macchiato", CategoryId("espresso"), 5.25m,
                    "Caramel first, coffee second, joy always.",
                    "Vanilla-marked steamed milk, espresso poured through the top, finished with a real caramel drizzle — not syrup from a pump.",
                    ["sweet", "vanilla"], Season.AllYear, Temperature.Hot, caffeineMg: 75),
                CreateProduct("ESP-MOCHA-005", "Mocha", CategoryId("espresso"), 5.50m,
                    "Where dessert and coffee stop arguing.",
                    "Dark chocolate melted directly into the espresso before the milk goes in, so the chocolate is a base note, not an afterthought stirred on top.",
                    ["chocolate", "rich"], Season.AllYear, Temperature.Hot, caffeineMg: 95),
                CreateProduct("CBR-ORIGINAL-006", "Original Cold Brew", CategoryId("cold-brew"), 4.75m,
                    "Steeped slow, poured cold, never bitter.",
                    "Coarse-ground beans steeped in cold water for eighteen hours. Naturally sweeter and lower-acid than iced hot-brewed coffee, by design, not accident.",
                    ["smooth", "low acid"], Season.AllYear, Temperature.Iced, caffeineMg: 200),
                CreateProduct("CBR-NITRO-007", "Nitro Cold Brew", CategoryId("cold-brew"), 5.25m,
                    "Cascades like a stout. Tastes like nothing else.",
                    "Our cold brew, charged with nitrogen and poured through a widget for that signature cascading pour and creamy head — no dairy required.",
                    ["creamy", "no dairy needed"], Season.AllYear, Temperature.Iced, caffeineMg: 215),
                CreateProduct("CBR-ICEDVANILLA-008", "Iced Vanilla Latte", CategoryId("cold-brew"), 5.00m,
                    "Sweet, cold, and quietly perfect.",
                    "Espresso over ice with cold milk and real vanilla bean syrup — the drink that convinces people who say they don't like coffee that they do.",
                    ["sweet", "iced"], Season.AllYear, Temperature.Iced, caffeineMg: 130),
                CreateProduct("SEA-PUMPKIN-009", "Pumpkin Spice Latte", CategoryId("seasonal"), 5.75m,
                    "Autumn, in a cup, on purpose.",
                    "Real pumpkin, not just the spice blend — cinnamon, clove, nutmeg, and steamed milk over espresso. Available while the season lasts.",
                    ["fall", "spiced"], Season.Fall, Temperature.Hot, caffeineMg: 95),
                CreateProduct("SEA-PEPPERMINT-010", "Peppermint Mocha", CategoryId("seasonal"), 5.75m,
                    "Winter's favorite plot twist.",
                    "Our mocha with real crushed peppermint, topped with whipped cream and a dusting of cocoa. Cold-weather comfort in a cup.",
                    ["winter", "chocolate"], Season.Winter, Temperature.Hot, caffeineMg: 95),
                CreateProduct("SEA-LAVENDER-011", "Honey Lavender Latte", CategoryId("seasonal"), 5.50m,
                    "Calm, in liquid form.",
                    "Local honey and a whisper of culinary lavender, steamed into milk over a double shot. Floral, not perfumed — a house favorite in spring.",
                    ["floral", "honey"], Season.Spring, Temperature.Hot, caffeineMg: 95),
                CreateProduct("TEA-MATCHA-012", "Matcha Latte", CategoryId("tea"), 4.75m,
                    "Earthy, whisked, wide awake.",
                    "Ceremonial-grade matcha, hand-whisked and steamed with milk of your choice. Gentle, sustained energy — no crash, no jitters.",
                    ["caffeine", "no coffee"], Season.AllYear, Temperature.Hot, caffeineMg: 70),
                CreateProduct("TEA-CHAI-013", "Chai Latte", CategoryId("tea"), 4.50m,
                    "Spice-forward, warmly stubborn.",
                    "Black tea steeped with cinnamon, cardamom, ginger, and clove, steamed with milk. Bold enough to hold its own against espresso drinkers.",
                    ["spiced", "no coffee"], Season.AllYear, Temperature.Hot, caffeineMg: 50),
                CreateProduct("TEA-JASMINE-014", "Jasmine Green Tea", CategoryId("tea"), 3.75m,
                    "Quiet, floral, unbothered.",
                    "Loose-leaf green tea scented with real jasmine blossoms, steeped fresh to order. The lightest thing on the menu, and proud of it.",
                    ["light", "caffeine-free option"], Season.AllYear, Temperature.Hot, caffeineMg: 25),
            };

            foreach (var product in products)
            {
                product.Publish();
                product.AddVariant("Small", Money.Zero(), 0);
                product.AddVariant("Medium", Money.Zero(), 1);
                product.AddVariant("Large", Money.Zero(), 2);
            }

            // A real, honest merchandising choice for the initial /featured set — one per
            // category, not arbitrary: the drink each category's own tagline treats as its
            // flagship (Classic Espresso, Nitro Cold Brew, Pumpkin Spice Latte, Matcha Latte).
            products[0].SetFeatured(true);
            products[6].SetFeatured(true);
            products[8].SetFeatured(true);
            products[11].SetFeatured(true);

            context.Products.AddRange(products);
            await context.SaveChangesAsync(ct);
        }
    }

    private static Product CreateProduct(
        string sku, string name, Guid categoryId, decimal price, string tagline, string description,
        string[] tags, Season season, Temperature temperature, int caffeineMg)
    {
        var product = Product.Create(
            Sku.Create(sku),
            name,
            categoryId,
            Price.Create(Money.Create(price)),
            tagline,
            description,
            tags,
            season,
            temperature,
            ProductType.Beverage);

        product.UpdateNutrition(NutritionFacts.Create(caffeineMg: caffeineMg));

        return product;
    }
}
