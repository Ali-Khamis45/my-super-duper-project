using Coffeshop.Domain.Common.ValueObjects;
using Coffeshop.Domain.Identity.Exceptions;
using Coffeshop.Domain.Identity.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Coffeshop.Domain.Tests.Identity;

public sealed class EmailTests
{
    [Theory]
    [InlineData("Alice@Example.com", "alice@example.com")]
    [InlineData("  bob@example.com  ", "bob@example.com")]
    public void Create_NormalizesToLowercaseAndTrims(string input, string expected)
    {
        Email.Create(input).Value.Should().Be(expected);
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    [InlineData("missing-domain@")]
    [InlineData("@missing-local.com")]
    public void Create_InvalidFormat_ThrowsInvalidEmailException(string input)
    {
        var act = () => Email.Create(input);

        act.Should().Throw<InvalidEmailException>();
    }

    [Fact]
    public void Equality_IsStructuralByNormalizedValue()
    {
        Email.Create("Alice@Example.com").Should().Be(Email.Create("alice@example.com"));
    }
}

public sealed class FullNameTests
{
    [Fact]
    public void Create_EmptyValue_ThrowsInvalidFullNameException()
    {
        var act = () => FullName.Create("   ");

        act.Should().Throw<InvalidFullNameException>();
    }

    [Fact]
    public void Create_TooLong_ThrowsInvalidFullNameException()
    {
        var act = () => FullName.Create(new string('a', 201));

        act.Should().Throw<InvalidFullNameException>();
    }

    [Fact]
    public void Create_TrimsWhitespace()
    {
        FullName.Create("  Alice Barista  ").Value.Should().Be("Alice Barista");
    }
}

public sealed class GuestContactInfoTests
{
    [Fact]
    public void Create_ValidEmail_Succeeds()
    {
        var contact = GuestContactInfo.Create("guest@example.com");

        contact.Email.Value.Should().Be("guest@example.com");
    }

    [Fact]
    public void Create_InvalidEmail_ThrowsInvalidEmailException()
    {
        var act = () => GuestContactInfo.Create("not-an-email");

        act.Should().Throw<InvalidEmailException>();
    }
}
