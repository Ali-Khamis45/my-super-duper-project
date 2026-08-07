using Coffeshop.Domain.Inventory;
using Coffeshop.Domain.Inventory.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Seed;

/// <summary>
/// Runtime, idempotent seeding — mirrors <see cref="CatalogSeeder"/>'s own pattern, run after it
/// (depends on the 9 ingredients it seeds already existing). Backfills one <see cref="InventoryItem"/>
/// per existing ingredient so this sprint's own feature is exercisable end-to-end in a fresh dev
/// environment, not just reachable only after an admin manually opts every ingredient in one at a
/// time through <c>CreateInventoryItemCommand</c>. Starting quantities are real, honest dev-seed
/// numbers (no live point-of-sale stock feed exists to source them from) — milk is deliberately
/// seeded with a raised low-stock threshold so a fresh environment has one real, visible
/// <see cref="InventoryStatus.LowStock"/> example to verify the admin dashboard against, not a
/// uniformly "everything is fine" data set that never exercises that path.
/// </summary>
public static class InventorySeeder
{
    public static async Task SeedAsync(CoffeshopDbContext context, CancellationToken ct = default)
    {
        if (await context.InventoryItems.AnyAsync(ct))
        {
            return;
        }

        var ingredientIdsByCode = await context.Ingredients.ToDictionaryAsync(i => i.Code, i => i.Id, ct);
        var now = DateTimeOffset.UtcNow;

        Guid IngredientId(string code) => ingredientIdsByCode[code];

        context.InventoryItems.AddRange(
            InventoryItem.Create(IngredientId("foam"), 40, now),
            InventoryItem.Create(IngredientId("cream"), 30, now),
            InventoryItem.Create(IngredientId("chocolate"), 25, now),
            InventoryItem.Create(IngredientId("caramel"), 25, now),
            InventoryItem.Create(IngredientId("cinnamon"), 60, now),
            InventoryItem.Create(IngredientId("sprinkles"), 50, now),
            InventoryItem.Create(IngredientId("ice"), 200, now),
            InventoryItem.Create(IngredientId("milk"), 15, now, LowStockPolicy.Create(20)),
            InventoryItem.Create(IngredientId("syrup"), 10, now));

        await context.SaveChangesAsync(ct);
    }
}
