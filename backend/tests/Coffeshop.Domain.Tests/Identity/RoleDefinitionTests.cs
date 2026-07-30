using Coffeshop.Domain.Identity;
using FluentAssertions;
using Xunit;

namespace Coffeshop.Domain.Tests.Identity;

public sealed class RoleDefinitionTests
{
    [Fact]
    public void Create_DeduplicatesPermissionCodes()
    {
        var role = RoleDefinition.Create("Staff", [PermissionCodes.ViewOrders, PermissionCodes.ViewOrders]);

        role.PermissionCodes.Should().ContainSingle();
    }

    [Fact]
    public void HasPermission_AssignedCode_ReturnsTrue()
    {
        var role = RoleDefinition.Create("Staff", [PermissionCodes.ViewOrders]);

        role.HasPermission(PermissionCodes.ViewOrders).Should().BeTrue();
        role.HasPermission(PermissionCodes.ManageUsers).Should().BeFalse();
    }
}
