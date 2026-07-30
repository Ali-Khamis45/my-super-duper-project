using Coffeshop.SharedKernel;

namespace Coffeshop.Domain.Identity;

/// <summary>
/// A named bundle of permissions — deliberately its own aggregate root, not a value inside
/// <see cref="User"/>, per docs/30_COMMERCE_DDD_MODEL.md ("so a permission-set change never
/// requires touching every user"). <see cref="User"/> references instances of this aggregate
/// only by id (<c>User.RoleIds</c>), never by navigation property, per this project's
/// cross-aggregate-reference convention.
/// </summary>
public sealed class RoleDefinition : AggregateRoot<Guid>
{
    private readonly List<string> _permissionCodes = [];

    public string Name { get; private set; } = null!;

    public IReadOnlyCollection<string> PermissionCodes => _permissionCodes.AsReadOnly();

    private RoleDefinition()
    {
    }

    public static RoleDefinition Create(string name, IEnumerable<string> permissionCodes)
    {
        var role = new RoleDefinition
        {
            Id = Guid.NewGuid(),
            Name = name,
        };

        role._permissionCodes.AddRange(permissionCodes.Distinct());
        return role;
    }

    public bool HasPermission(string permissionCode) => _permissionCodes.Contains(permissionCode);
}

/// <summary>
/// The three seeded roles' names, per docs/33_AUTH_ARCHITECTURE.md's roles table — referenced
/// by name from seed data and tests, never hand-typed as a string literal elsewhere.
/// </summary>
public static class RoleNames
{
    public const string Customer = "Customer";
    public const string Staff = "Staff";
    public const string Admin = "Admin";
}
