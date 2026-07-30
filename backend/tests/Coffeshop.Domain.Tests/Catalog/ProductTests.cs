using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Catalog.Events;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Catalog.ValueObjects;
using FluentAssertions;
using Xunit;

namespace Coffeshop.Domain.Tests.Catalog;

public sealed class ProductTests
{
    private static Product CreateProduct() =>
        Product.Create(
            Sku.Create("TEST-001"),
            "Test Drink",
            Guid.NewGuid(),
            Price.Create(Money.Create(4.00m)),
            "A tagline.",
            "A description.",
            ["test"],
            Season.AllYear,
            Temperature.Hot,
            ProductType.Beverage);

    [Fact]
    public void Create_ValidInput_StartsAsDraftAndAvailable()
    {
        var product = CreateProduct();

        product.Status.Should().Be(ProductStatus.Draft);
        product.IsAvailable.Should().BeTrue();
        product.IsFeatured.Should().BeFalse();
        product.DomainEvents.Should().ContainSingle(e => e is ProductCreatedEvent);
    }

    [Fact]
    public void Publish_FromDraft_Succeeds()
    {
        var product = CreateProduct();

        product.Publish();

        product.Status.Should().Be(ProductStatus.Published);
        product.DomainEvents.Should().Contain(e => e is ProductPublishedEvent);
    }

    [Fact]
    public void Publish_AlreadyPublished_Throws()
    {
        var product = CreateProduct();
        product.Publish();

        var act = product.Publish;

        act.Should().Throw<InvalidProductStatusTransitionException>();
    }

    [Fact]
    public void Archive_SetsStatusAndClearsAvailability()
    {
        var product = CreateProduct();
        product.Publish();

        product.Archive();

        product.Status.Should().Be(ProductStatus.Archived);
        product.IsAvailable.Should().BeFalse();
        product.DomainEvents.Should().Contain(e => e is ProductArchivedEvent);
    }

    [Fact]
    public void Restore_FromArchived_ReturnsToDraft()
    {
        var product = CreateProduct();
        product.Publish();
        product.Archive();

        product.Restore();

        product.Status.Should().Be(ProductStatus.Draft);
        product.DomainEvents.Should().Contain(e => e is ProductRestoredEvent);
    }

    [Fact]
    public void Restore_NotArchived_IsANoOp()
    {
        var product = CreateProduct();

        product.Restore();

        product.Status.Should().Be(ProductStatus.Draft);
    }

    [Fact]
    public void PrepareForDeletion_DraftProduct_RaisesProductDeletedEvent()
    {
        var product = CreateProduct();

        product.PrepareForDeletion();

        product.DomainEvents.Should().Contain(e => e is ProductDeletedEvent);
    }

    [Fact]
    public void PrepareForDeletion_PublishedProduct_ThrowsAndRaisesNoEvent()
    {
        var product = CreateProduct();
        product.Publish();
        product.ClearDomainEvents();

        var act = product.PrepareForDeletion;

        act.Should().Throw<InvalidProductStatusTransitionException>();
        product.DomainEvents.Should().BeEmpty();
    }

    [Theory]
    [MemberData(nameof(MutatingActions))]
    public void ArchivedProduct_AnyMutation_ThrowsProductArchivedException(Action<Product> mutate)
    {
        var product = CreateProduct();
        product.Publish();
        product.Archive();

        var act = () => mutate(product);

        act.Should().Throw<ProductArchivedException>();
    }

    public static TheoryData<Action<Product>> MutatingActions => new()
    {
        p => p.UpdateDetails("New name", "New tagline", "New description", ["a"]),
        p => p.UpdatePricing(Price.Create(Money.Create(9.99m))),
        p => p.AssignCategory(Guid.NewGuid()),
        p => p.AddVariant("Large", Money.Zero(), 0),
        p => p.AddImage("https://example.com/x.jpg", null, false, 0),
    };

    [Fact]
    public void UpdatePricing_AmountChanges_RaisesPriceChangedEvent()
    {
        var product = CreateProduct();

        product.UpdatePricing(Price.Create(Money.Create(5.00m)));

        var priceChanged = product.DomainEvents.OfType<ProductPriceChangedEvent>().Should().ContainSingle().Subject;
        priceChanged.OldAmount.Should().Be(4.00m);
        priceChanged.NewAmount.Should().Be(5.00m);
    }

    [Fact]
    public void UpdatePricing_SameAmount_DoesNotRaisePriceChangedEvent()
    {
        var product = CreateProduct();
        product.ClearDomainEvents();

        product.UpdatePricing(Price.Create(Money.Create(4.00m)));

        product.DomainEvents.Should().NotContain(e => e is ProductPriceChangedEvent);
    }

    [Fact]
    public void AddImage_MarkedPrimary_UnmarksExistingPrimaryImage()
    {
        var product = CreateProduct();
        var first = product.AddImage("https://example.com/1.jpg", null, true, 0);

        product.AddImage("https://example.com/2.jpg", null, true, 1);

        product.Images.Single(i => i.Id == first.Id).IsPrimary.Should().BeFalse();
    }

    [Fact]
    public void RemoveVariant_RemovesOnlyTheMatchingVariant()
    {
        var product = CreateProduct();
        var small = product.AddVariant("Small", Money.Zero(), 0);
        product.AddVariant("Large", Money.Zero(), 1);

        product.RemoveVariant(small.Id);

        product.Variants.Should().ContainSingle(v => v.Name == "Large");
    }
}
