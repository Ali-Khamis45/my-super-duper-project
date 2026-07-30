using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Catalog.Products;
using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Catalog.ValueObjects;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace Coffeshop.Application.Tests.Catalog;

public sealed class CreateProductCommandHandlerTests
{
    private readonly IProductRepository _productRepository = Substitute.For<IProductRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly CreateProductCommandHandler _sut;

    public CreateProductCommandHandlerTests()
    {
        _sut = new CreateProductCommandHandler(_productRepository, _categoryRepository);
    }

    private static CreateProductCommand ValidCommand() => new(
        "ESP-001", "Test Drink", "espresso", 4.00m, null,
        "A tagline.", "A description.", ["signature"], "AllYear", "Hot", "Beverage");

    [Fact]
    public async Task Handle_SkuAlreadyExists_ThrowsWithoutTouchingCategoryRepository()
    {
        _productRepository.ExistsBySkuAsync("ESP-001", Arg.Any<CancellationToken>()).Returns(true);

        var act = () => _sut.Handle(ValidCommand(), CancellationToken.None);

        await act.Should().ThrowAsync<SkuAlreadyExistsException>();
        await _categoryRepository.DidNotReceive().GetByCodeAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_UnknownCategoryCode_ThrowsCategoryNotFoundException()
    {
        _productRepository.ExistsBySkuAsync("ESP-001", Arg.Any<CancellationToken>()).Returns(false);
        _categoryRepository.GetByCodeAsync("espresso", Arg.Any<CancellationToken>()).Returns((Category?)null);

        var act = () => _sut.Handle(ValidCommand(), CancellationToken.None);

        await act.Should().ThrowAsync<CategoryNotFoundException>();
    }

    [Fact]
    public async Task Handle_ValidCommand_AddsDraftProductAndReturnsDto()
    {
        _productRepository.ExistsBySkuAsync("ESP-001", Arg.Any<CancellationToken>()).Returns(false);
        var category = Category.Create("espresso", "Espresso", 0);
        _categoryRepository.GetByCodeAsync("espresso", Arg.Any<CancellationToken>()).Returns(category);

        var dto = await _sut.Handle(ValidCommand(), CancellationToken.None);

        dto.Category.Should().Be("espresso");
        dto.Status.Should().Be("draft");
        _productRepository.Received(1).Add(Arg.Is<Product>(p => p != null && p.Sku.Value == "ESP-001"));
    }
}

public sealed class UpdatePricingCommandHandlerTests
{
    private readonly IProductRepository _productRepository = Substitute.For<IProductRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly UpdatePricingCommandHandler _sut;

    public UpdatePricingCommandHandlerTests()
    {
        _sut = new UpdatePricingCommandHandler(_productRepository, _categoryRepository);
    }

    private static Product ExistingProduct() => Product.Create(
        Sku.Create("ESP-001"), "Test Drink", Guid.NewGuid(), Price.Create(Money.Create(4.00m)),
        "A tagline.", "A description.", ["signature"], Season.AllYear, Temperature.Hot, ProductType.Beverage);

    [Fact]
    public async Task Handle_UnknownProduct_ThrowsProductNotFoundException()
    {
        _productRepository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Product?)null);

        var act = () => _sut.Handle(new UpdatePricingCommand(Guid.NewGuid(), 5.00m, null), CancellationToken.None);

        await act.Should().ThrowAsync<ProductNotFoundException>();
    }

    [Fact]
    public async Task Handle_ExistingProduct_UpdatesPriceAndReturnsCategoryCode()
    {
        var product = ExistingProduct();
        _productRepository.GetByIdAsync(product.Id, Arg.Any<CancellationToken>()).Returns(product);
        _categoryRepository.GetByIdAsync(product.CategoryId, Arg.Any<CancellationToken>())
            .Returns(Category.Create("espresso", "Espresso", 0));

        var dto = await _sut.Handle(new UpdatePricingCommand(product.Id, 6.50m, null), CancellationToken.None);

        dto.Price.Should().Be(6.50m);
        dto.Category.Should().Be("espresso");
    }

    [Fact]
    public async Task Handle_ArchivedProduct_ThrowsProductArchivedException()
    {
        var product = ExistingProduct();
        product.Publish();
        product.Archive();
        _productRepository.GetByIdAsync(product.Id, Arg.Any<CancellationToken>()).Returns(product);

        var act = () => _sut.Handle(new UpdatePricingCommand(product.Id, 6.50m, null), CancellationToken.None);

        await act.Should().ThrowAsync<ProductArchivedException>();
    }
}

public sealed class PublishProductCommandHandlerTests
{
    private readonly IProductRepository _productRepository = Substitute.For<IProductRepository>();
    private readonly PublishProductCommandHandler _sut;

    public PublishProductCommandHandlerTests()
    {
        _sut = new PublishProductCommandHandler(_productRepository);
    }

    [Fact]
    public async Task Handle_UnknownProduct_ThrowsProductNotFoundException()
    {
        _productRepository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Product?)null);

        var act = () => _sut.Handle(new PublishProductCommand(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<ProductNotFoundException>();
    }

    [Fact]
    public async Task Handle_DraftProduct_TransitionsToPublished()
    {
        var product = Product.Create(
            Sku.Create("ESP-001"), "Test Drink", Guid.NewGuid(), Price.Create(Money.Create(4.00m)),
            "A tagline.", "A description.", [], Season.AllYear, Temperature.Hot, ProductType.Beverage);
        _productRepository.GetByIdAsync(product.Id, Arg.Any<CancellationToken>()).Returns(product);

        await _sut.Handle(new PublishProductCommand(product.Id), CancellationToken.None);

        product.Status.Should().Be(ProductStatus.Published);
    }
}

public sealed class DeleteProductCommandHandlerTests
{
    private readonly IProductRepository _productRepository = Substitute.For<IProductRepository>();
    private readonly DeleteProductCommandHandler _sut;

    public DeleteProductCommandHandlerTests()
    {
        _sut = new DeleteProductCommandHandler(_productRepository);
    }

    private static Product DraftProduct() => Product.Create(
        Sku.Create("ESP-001"), "Test Drink", Guid.NewGuid(), Price.Create(Money.Create(4.00m)),
        "A tagline.", "A description.", [], Season.AllYear, Temperature.Hot, ProductType.Beverage);

    [Fact]
    public async Task Handle_DraftProduct_RemovesIt()
    {
        var product = DraftProduct();
        _productRepository.GetByIdAsync(product.Id, Arg.Any<CancellationToken>()).Returns(product);

        await _sut.Handle(new DeleteProductCommand(product.Id), CancellationToken.None);

        _productRepository.Received(1).Remove(product);
    }

    [Fact]
    public async Task Handle_PublishedProduct_ThrowsInsteadOfHardDeleting()
    {
        var product = DraftProduct();
        product.Publish();
        _productRepository.GetByIdAsync(product.Id, Arg.Any<CancellationToken>()).Returns(product);

        var act = () => _sut.Handle(new DeleteProductCommand(product.Id), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidProductStatusTransitionException>();
        _productRepository.DidNotReceive().Remove(Arg.Any<Product>());
    }
}

public sealed class GetMenuQueryHandlerTests
{
    private readonly IProductRepository _productRepository = Substitute.For<IProductRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly GetMenuQueryHandler _sut;

    public GetMenuQueryHandlerTests()
    {
        _sut = new GetMenuQueryHandler(_productRepository, _categoryRepository);
    }

    [Fact]
    public async Task Handle_OnlyRequestsPublishedAvailableProducts()
    {
        _productRepository
            .GetPagedAsync(
                Arg.Is<ProductFilter>(f => f != null && f.Status == ProductStatus.Published && f.IsAvailable == true),
                Arg.Any<ProductSortBy>(), 0, int.MaxValue, Arg.Any<CancellationToken>())
            .Returns(((IReadOnlyList<Product>)[], 0));
        _categoryRepository.GetAllAsync(Arg.Any<CancellationToken>()).Returns((IReadOnlyList<Category>)[]);

        var result = await _sut.Handle(new GetMenuQuery(), CancellationToken.None);

        result.Should().BeEmpty();
        await _productRepository.Received(1).GetPagedAsync(
            Arg.Is<ProductFilter>(f => f != null && f.Status == ProductStatus.Published && f.IsAvailable == true),
            Arg.Any<ProductSortBy>(), 0, int.MaxValue, Arg.Any<CancellationToken>());
    }
}
