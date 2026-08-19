using Coffeshop.Domain.Identity;
using Microsoft.EntityFrameworkCore;

namespace Coffeshop.Persistence.Seed;

/// <summary>
/// Runtime, idempotent seeding (checked at startup, not baked into a migration) of the
/// permission catalog and the three roles docs/33_AUTH_ARCHITECTURE.md names — matching
/// docs/41_BACKEND_DEVELOPMENT_STANDARDS.md's migration strategy note that seed content isn't
/// schema and doesn't belong hand-edited into migration history.
/// </summary>
public static class IdentitySeeder
{
    public static async Task SeedAsync(CoffeshopDbContext context, CancellationToken ct = default)
    {
        if (!await context.Permissions.AnyAsync(ct))
        {
            foreach (var (code, description) in PermissionCodes.AllWithDescriptions)
            {
                context.Permissions.Add(new Permission(code, description));
            }

            await context.SaveChangesAsync(ct);
        }

        if (!await context.Roles.AnyAsync(ct))
        {
            context.Roles.Add(RoleDefinition.Create(RoleNames.Customer, []));

            context.Roles.Add(RoleDefinition.Create(RoleNames.Staff,
            [
                PermissionCodes.ViewOrders,
                PermissionCodes.UpdateOrderStatus,
                PermissionCodes.ViewInventory,
                PermissionCodes.AdjustInventory,
                PermissionCodes.ViewPayments,
            ]));

            context.Roles.Add(RoleDefinition.Create(RoleNames.Admin, [.. PermissionCodes.AllWithDescriptions.Keys]));

            await context.SaveChangesAsync(ct);
        }
    }
}
