using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Identity;

/// <summary>
/// A fine-grained permission code (<c>"products:manage"</c>, <c>"orders:view"</c>) — a small
/// reference/lookup entity, seeded once, per docs/33_AUTH_ARCHITECTURE.md's "authorization
/// checks always target a permission, never a role name directly" rule. <see cref="Id"/> is
/// the stable code itself (never a surrogate Guid) since permission codes are the actual
/// contract every <c>[Authorize(Policy = ...)]</c> attribute and JWT claim references.
/// </summary>
public sealed class Permission : Entity<string>
{
    public string Description { get; private set; } = null!;

    private Permission()
    {
    }

    public Permission(string code, string description)
        : base(code)
    {
        Description = description;
    }
}

/// <summary>
/// The closed catalog of permission codes this sprint seeds and uses — matching
/// docs/33_AUTH_ARCHITECTURE.md's roles-and-permissions table. Referenced by code from claims
/// transformation and policy registration (Coffeshop.Api), never hand-typed as a string
/// literal at a call site.
/// </summary>
public static class PermissionCodes
{
    public const string ViewOrders = "orders:view";
    public const string UpdateOrderStatus = "orders:update-status";
    public const string ViewInventory = "inventory:view";
    public const string AdjustInventory = "inventory:adjust";
    public const string ManageUsers = "users:manage";
    public const string ManageRoles = "roles:manage";
    public const string ManageContent = "content:manage";
    public const string ManageProducts = "products:manage";
    public const string ViewAnalytics = "analytics:view";
    public const string ProcessRefunds = "refunds:process";
    public const string ViewAuditLogs = "audit-logs:view";
    /// <summary>Additive (Sprint 5.5) — the Payments bounded context's own read permission, matching <see cref="ViewOrders"/>'s own role. <see cref="ProcessRefunds"/> was already frozen in Phase 0 and seeded to <c>Admin</c> only (never <c>Staff</c>) — reused as-is for the real refund capability this sprint builds, not redefined.</summary>
    public const string ViewPayments = "payments:view";

    public static IReadOnlyDictionary<string, string> AllWithDescriptions { get; } = new Dictionary<string, string>
    {
        [ViewOrders] = "View orders",
        [UpdateOrderStatus] = "Update an order's status",
        [ViewInventory] = "View inventory levels",
        [AdjustInventory] = "Adjust inventory stock",
        [ManageUsers] = "Manage user accounts",
        [ManageRoles] = "Manage roles and permission assignments",
        [ManageContent] = "Manage CMS content",
        [ManageProducts] = "Manage the product catalog",
        [ViewAnalytics] = "View analytics dashboards",
        [ProcessRefunds] = "Process order refunds",
        [ViewAuditLogs] = "View the audit log",
        [ViewPayments] = "View payment records",
    };
}
