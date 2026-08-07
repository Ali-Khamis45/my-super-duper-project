using Coffeshop.Application.Common.Dtos;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Inventory.Coordination;
using Coffeshop.Application.Ordering.Dtos;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Ordering.Orders;
using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Catalog.ValueObjects;
using Coffeshop.Domain.Identity;
using Coffeshop.Domain.Ordering;
using Coffeshop.Domain.Ordering.Exceptions;
using Coffeshop.Domain.Ordering.ValueObjects;
using FluentAssertions;
using NSubstitute;
using Xunit;

namespace Coffeshop.Application.Tests.Ordering;

public sealed class CreateOrderFromCartCommandHandlerTests
{
    private readonly IOrderRepository _orderRepository = Substitute.For<IOrderRepository>();
    private readonly IProductRepository _productRepository = Substitute.For<IProductRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly IIngredientRepository _ingredientRepository = Substitute.For<IIngredientRepository>();
    private readonly IInventoryReservationCoordinator _inventoryReservationCoordinator = Substitute.For<IInventoryReservationCoordinator>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();
    private readonly IClock _clock = Substitute.For<IClock>();
    private readonly CreateOrderFromCartCommandHandler _sut;

    public CreateOrderFromCartCommandHandlerTests()
    {
        _sut = new CreateOrderFromCartCommandHandler(_orderRepository, _productRepository, _categoryRepository, _ingredientRepository, _inventoryReservationCoordinator, _currentUserService, _clock);
        _clock.UtcNow.Returns(new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero));
        _orderRepository.NextOrderNumberAsync(Arg.Any<CancellationToken>()).Returns(1L);
        _ingredientRepository.GetAllAsync(Arg.Any<CancellationToken>()).Returns((IReadOnlyList<Ingredient>)[]);
    }

    private static Product PublishedProduct(Guid categoryId, decimal price = 4.50m)
    {
        var product = Product.Create(
            Sku.Create("ESP-001"), "Cappuccino", categoryId, Price.Create(Money.Create(price)),
            "A tagline.", "A description.", [], Season.AllYear, Temperature.Hot, ProductType.Beverage);
        product.Publish();
        return product;
    }

    private static RecipeSelectionDto EmptySelection() => new("cream", "medium", "kraft", "classic", "classic", "glossy", []);

    private static CartLineInput Line(Guid productId, int quantity = 1) => new(productId, EmptySelection(), quantity, null);

    [Fact]
    public async Task Handle_AuthenticatedCaller_DerivesCustomerIdFromCurrentUserNeverFromRequest()
    {
        var category = Category.Create("espresso", "Espresso", 0);
        var product = PublishedProduct(category.Id);
        var customerId = Guid.NewGuid();
        _currentUserService.UserId.Returns(customerId);
        _productRepository.GetByIdAsync(product.Id, Arg.Any<CancellationToken>()).Returns(product);
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);

        var dto = await _sut.Handle(new CreateOrderFromCartCommand([Line(product.Id)], null, null, "Pickup", "test-idempotency-key"), CancellationToken.None);

        dto.CustomerId.Should().Be(customerId);
        dto.GuestEmail.Should().BeNull();
    }

    [Fact]
    public async Task Handle_AnonymousCallerWithoutGuestInfo_ThrowsInvalidGuestOrderInfoException()
    {
        _currentUserService.UserId.Returns((Guid?)null);

        var act = () => _sut.Handle(new CreateOrderFromCartCommand([Line(Guid.NewGuid())], null, null, "Pickup", "test-idempotency-key"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidGuestOrderInfoException>();
    }

    [Fact]
    public async Task Handle_UnknownProduct_ThrowsProductNotFoundException()
    {
        _currentUserService.UserId.Returns(Guid.NewGuid());
        _productRepository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Product?)null);

        var act = () => _sut.Handle(new CreateOrderFromCartCommand([Line(Guid.NewGuid())], null, null, "Pickup", "test-idempotency-key"), CancellationToken.None);

        await act.Should().ThrowAsync<ProductNotFoundException>();
    }

    [Fact]
    public async Task Handle_UnpublishedProduct_ThrowsProductNotAvailableException()
    {
        var category = Category.Create("espresso", "Espresso", 0);
        var draftProduct = Product.Create(
            Sku.Create("ESP-002"), "Not Yet Live", category.Id, Price.Create(Money.Create(4.50m)),
            "A tagline.", "A description.", [], Season.AllYear, Temperature.Hot, ProductType.Beverage);
        _currentUserService.UserId.Returns(Guid.NewGuid());
        _productRepository.GetByIdAsync(draftProduct.Id, Arg.Any<CancellationToken>()).Returns(draftProduct);

        var act = () => _sut.Handle(new CreateOrderFromCartCommand([Line(draftProduct.Id)], null, null, "Pickup", "test-idempotency-key"), CancellationToken.None);

        await act.Should().ThrowAsync<ProductNotAvailableException>();
    }

    [Fact]
    public async Task Handle_ArchivedUnavailableProduct_ThrowsProductNotAvailableException()
    {
        var category = Category.Create("espresso", "Espresso", 0);
        var product = PublishedProduct(category.Id);
        product.Archive();
        _currentUserService.UserId.Returns(Guid.NewGuid());
        _productRepository.GetByIdAsync(product.Id, Arg.Any<CancellationToken>()).Returns(product);

        var act = () => _sut.Handle(new CreateOrderFromCartCommand([Line(product.Id)], null, null, "Pickup", "test-idempotency-key"), CancellationToken.None);

        await act.Should().ThrowAsync<ProductNotAvailableException>();
    }

    [Fact]
    public async Task Handle_IncompatibleIngredient_ThrowsInvalidIngredientCompatibilityException()
    {
        var category = Category.Create("espresso", "Espresso", 0);
        var product = PublishedProduct(category.Id);
        var milkOnlyIngredient = Ingredient.Create("oat-milk", "Oat Milk", Guid.NewGuid(), Money.Create(0.5m), ["tea"], false, "#fff", IngredientShape.Ring, 0);
        _currentUserService.UserId.Returns(Guid.NewGuid());
        _productRepository.GetByIdAsync(product.Id, Arg.Any<CancellationToken>()).Returns(product);
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _ingredientRepository.GetAllAsync(Arg.Any<CancellationToken>()).Returns((IReadOnlyList<Ingredient>)[milkOnlyIngredient]);

        var line = new CartLineInput(product.Id, new RecipeSelectionDto("cream", "medium", "kraft", "classic", "classic", "glossy", [new RecipeIngredientPlacementDto("oat-milk", 1)]), 1, null);

        var act = () => _sut.Handle(new CreateOrderFromCartCommand([line], null, null, "Pickup", "test-idempotency-key"), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidIngredientCompatibilityException>();
    }

    [Fact]
    public async Task Handle_NeverTrustsClientPricing_RecalculatesFromCatalogAndIngredients()
    {
        // The real point of this whole command: never accept a client-supplied unitPrice/total,
        // always recompute server-side from the catalog's own Price and each Ingredient's own
        // PriceModifier — the request DTO doesn't even have a price field to ignore, so this
        // locks in the actual arithmetic (product price + sum(modifier * quantity)) instead.
        var category = Category.Create("espresso", "Espresso", 0);
        var product = PublishedProduct(category.Id, price: 4.50m);
        var foam = Ingredient.Create("foam", "Extra Foam", Guid.NewGuid(), Money.Create(0.50m), [], true, "#fff", IngredientShape.Sprinkles, 0);
        _currentUserService.UserId.Returns(Guid.NewGuid());
        _productRepository.GetByIdAsync(product.Id, Arg.Any<CancellationToken>()).Returns(product);
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _ingredientRepository.GetAllAsync(Arg.Any<CancellationToken>()).Returns((IReadOnlyList<Ingredient>)[foam]);

        var line = new CartLineInput(
            product.Id,
            new RecipeSelectionDto("cream", "medium", "kraft", "classic", "classic", "glossy", [new RecipeIngredientPlacementDto("foam", 2)]),
            Quantity: 3,
            null);

        var dto = await _sut.Handle(new CreateOrderFromCartCommand([line], null, null, "Pickup", "test-idempotency-key"), CancellationToken.None);

        // unitPrice = 4.50 + (0.50 * 2) = 5.50; lineTotal = 5.50 * 3 = 16.50
        dto.Items.Single().UnitPrice.Should().Be(5.50m);
        dto.Items.Single().LineTotal.Should().Be(16.50m);
        dto.Total.Should().Be(16.50m);
    }

    [Fact]
    public async Task Handle_ValidCart_CreatesSubmittedOrderAndAddsItToRepository()
    {
        var category = Category.Create("espresso", "Espresso", 0);
        var product = PublishedProduct(category.Id);
        _currentUserService.UserId.Returns((Guid?)null);
        _productRepository.GetByIdAsync(product.Id, Arg.Any<CancellationToken>()).Returns(product);
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);

        var dto = await _sut.Handle(new CreateOrderFromCartCommand([Line(product.Id)], "Ada Lovelace", "ada@example.com", "Pickup", "test-idempotency-key"), CancellationToken.None);

        dto.Status.Should().Be("submitted");
        dto.Timeline.Select(t => t.Status).Should().Equal("draft", "submitted");
        _orderRepository.Received(1).Add(Arg.Is<Order>(o => o != null && o.Status == OrderStatus.Submitted));
    }

    [Fact]
    public async Task Handle_DuplicateIdempotencyKey_ReturnsTheExistingOrderWithoutCreatingASecondOne()
    {
        // Phase 10 regression test — a real bug this sprint's own adversarial review caught live:
        // two concurrent identical checkout requests (no idempotency protection at the time)
        // created two separate real orders. See Order.IdempotencyKey's own doc comment.
        var category = Category.Create("espresso", "Espresso", 0);
        var product = PublishedProduct(category.Id);
        var existingOrder = Order.Create(OrderNumber.FromSequenceValue(1), Guid.NewGuid(), null, FulfillmentMethod.Pickup, DateTimeOffset.UtcNow, "duplicate-key");
        _orderRepository.GetByIdempotencyKeyAsync("duplicate-key", Arg.Any<CancellationToken>()).Returns(existingOrder);

        var dto = await _sut.Handle(new CreateOrderFromCartCommand([Line(product.Id)], "Ada Lovelace", "ada@example.com", "Pickup", "duplicate-key"), CancellationToken.None);

        dto.Id.Should().Be(existingOrder.Id);
        await _productRepository.DidNotReceive().GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await _orderRepository.DidNotReceive().NextOrderNumberAsync(Arg.Any<CancellationToken>());
        _orderRepository.DidNotReceive().Add(Arg.Any<Order>());
    }
}

public sealed class CancelOrderCommandHandlerTests
{
    private readonly IOrderRepository _orderRepository = Substitute.For<IOrderRepository>();
    private readonly IInventoryReservationCoordinator _inventoryReservationCoordinator = Substitute.For<IInventoryReservationCoordinator>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();
    private readonly IClock _clock = Substitute.For<IClock>();
    private readonly CancelOrderCommandHandler _sut;

    public CancelOrderCommandHandlerTests()
    {
        _sut = new CancelOrderCommandHandler(_orderRepository, _inventoryReservationCoordinator, _currentUserService, _clock);
        _clock.UtcNow.Returns(DateTimeOffset.UtcNow);
    }

    private static Order SubmittedOrderFor(Guid customerId)
    {
        var order = Order.Create(OrderNumber.FromSequenceValue(1), customerId, null, FulfillmentMethod.Pickup, DateTimeOffset.UtcNow);
        order.AddItem(Guid.NewGuid(), "Cappuccino", "ESP-001", RecipeSelection.Create("cream", "medium", "kraft", "classic", "classic", "glossy", []), Money.Create(4.50m), 1, null);
        order.Submit(DateTimeOffset.UtcNow);
        return order;
    }

    [Fact]
    public async Task Handle_UnknownOrder_ThrowsOrderNotFoundException()
    {
        _orderRepository.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns((Order?)null);

        var act = () => _sut.Handle(new CancelOrderCommand(Guid.NewGuid(), null), CancellationToken.None);

        await act.Should().ThrowAsync<OrderNotFoundException>();
    }

    [Fact]
    public async Task Handle_NonOwnerNonStaffCaller_ThrowsOrderNotFoundNeverAPermissionError()
    {
        // The deliberate design: a caller with no business seeing this order gets the exact same
        // 404-shaped exception as a genuinely nonexistent id — never a 403 that would confirm the
        // order exists at all. See CancelOrderCommand's own doc comment.
        var order = SubmittedOrderFor(Guid.NewGuid());
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _currentUserService.UserId.Returns(Guid.NewGuid());
        _currentUserService.Permissions.Returns((IReadOnlyCollection<string>)[]);

        var act = () => _sut.Handle(new CancelOrderCommand(order.Id, "not mine"), CancellationToken.None);

        await act.Should().ThrowAsync<OrderNotFoundException>();
    }

    [Fact]
    public async Task Handle_Owner_CancelsSuccessfully()
    {
        var customerId = Guid.NewGuid();
        var order = SubmittedOrderFor(customerId);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _currentUserService.UserId.Returns(customerId);
        _currentUserService.Permissions.Returns((IReadOnlyCollection<string>)[]);

        var dto = await _sut.Handle(new CancelOrderCommand(order.Id, "Changed my mind"), CancellationToken.None);

        dto.Status.Should().Be("cancelled");
    }

    [Fact]
    public async Task Handle_StaffNonOwner_CancelsSuccessfully()
    {
        var order = SubmittedOrderFor(Guid.NewGuid());
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _currentUserService.UserId.Returns(Guid.NewGuid());
        _currentUserService.Permissions.Returns((IReadOnlyCollection<string>)[PermissionCodes.UpdateOrderStatus]);

        var dto = await _sut.Handle(new CancelOrderCommand(order.Id, "Staff cancelled"), CancellationToken.None);

        dto.Status.Should().Be("cancelled");
    }
}

public sealed class GetOrderQueryHandlerTests
{
    private readonly IOrderRepository _orderRepository = Substitute.For<IOrderRepository>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();
    private readonly GetOrderQueryHandler _sut;

    public GetOrderQueryHandlerTests()
    {
        _sut = new GetOrderQueryHandler(_orderRepository, _currentUserService);
    }

    private static Order DraftOrderFor(Guid? customerId, Coffeshop.Domain.Ordering.ValueObjects.GuestOrderInfo? guestInfo = null) =>
        Order.Create(OrderNumber.FromSequenceValue(1), customerId, guestInfo, FulfillmentMethod.Pickup, DateTimeOffset.UtcNow);

    [Fact]
    public async Task Handle_NonOwnerNonStaff_ThrowsOrderNotFoundException()
    {
        var order = DraftOrderFor(Guid.NewGuid());
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _currentUserService.UserId.Returns(Guid.NewGuid());
        _currentUserService.Permissions.Returns((IReadOnlyCollection<string>)[]);

        var act = () => _sut.Handle(new GetOrderQuery(order.Id), CancellationToken.None);

        await act.Should().ThrowAsync<OrderNotFoundException>();
    }

    [Fact]
    public async Task Handle_StaffWithViewOrders_CanReadAnyCustomersOrder()
    {
        var order = DraftOrderFor(Guid.NewGuid());
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _currentUserService.UserId.Returns(Guid.NewGuid());
        _currentUserService.Permissions.Returns((IReadOnlyCollection<string>)[PermissionCodes.ViewOrders]);

        var dto = await _sut.Handle(new GetOrderQuery(order.Id), CancellationToken.None);

        dto.Id.Should().Be(order.Id);
    }

    [Fact]
    public async Task Handle_GuestOrder_AnonymousCallerCannotReadIt()
    {
        // Guests have no account to authenticate as, so an anonymous caller (UserId null) can
        // never satisfy the ownership check for a guest order — only staff/admin can look it up.
        var guestInfo = Coffeshop.Domain.Ordering.ValueObjects.GuestOrderInfo.Create("Ada Lovelace", "ada@example.com");
        var order = DraftOrderFor(null, guestInfo);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _currentUserService.UserId.Returns((Guid?)null);
        _currentUserService.Permissions.Returns((IReadOnlyCollection<string>)[]);

        var act = () => _sut.Handle(new GetOrderQuery(order.Id), CancellationToken.None);

        await act.Should().ThrowAsync<OrderNotFoundException>();
    }
}

public sealed class PayOrderCommandHandlerTests
{
    private readonly IOrderRepository _orderRepository = Substitute.For<IOrderRepository>();
    private readonly IInventoryReservationCoordinator _inventoryReservationCoordinator = Substitute.For<IInventoryReservationCoordinator>();
    private readonly IClock _clock = Substitute.For<IClock>();
    private readonly PayOrderCommandHandler _sut;

    public PayOrderCommandHandlerTests()
    {
        _sut = new PayOrderCommandHandler(_orderRepository, _inventoryReservationCoordinator, _clock);
        _clock.UtcNow.Returns(DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task Handle_DraftOrder_ThrowsInvalidOrderStatusTransitionException()
    {
        var order = Order.Create(OrderNumber.FromSequenceValue(1), Guid.NewGuid(), null, FulfillmentMethod.Pickup, DateTimeOffset.UtcNow);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);

        var act = () => _sut.Handle(new PayOrderCommand(order.Id), CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOrderStatusTransitionException>();
    }

    [Fact]
    public async Task Handle_SubmittedOrder_MarksPaid()
    {
        var order = Order.Create(OrderNumber.FromSequenceValue(1), Guid.NewGuid(), null, FulfillmentMethod.Pickup, DateTimeOffset.UtcNow);
        order.AddItem(Guid.NewGuid(), "Cappuccino", "ESP-001", RecipeSelection.Create("cream", "medium", "kraft", "classic", "classic", "glossy", []), Money.Create(4.50m), 1, null);
        order.Submit(DateTimeOffset.UtcNow);
        _orderRepository.GetByIdAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);

        var dto = await _sut.Handle(new PayOrderCommand(order.Id), CancellationToken.None);

        dto.Status.Should().Be("paid");
    }
}

public sealed class GetOrdersQueryHandlerTests
{
    private readonly IOrderRepository _orderRepository = Substitute.For<IOrderRepository>();
    private readonly GetOrdersQueryHandler _sut;

    public GetOrdersQueryHandlerTests()
    {
        _sut = new GetOrdersQueryHandler(_orderRepository);
    }

    [Fact]
    public async Task Handle_PassesFilterAndSortThroughToRepository()
    {
        _orderRepository
            .GetPagedAsync(Arg.Any<OrderFilter>(), OrderSortBy.Oldest, 0, 20, Arg.Any<CancellationToken>())
            .Returns(((IReadOnlyList<Order>)[], 0));

        var filter = new OrderFilter(Status: OrderStatus.Submitted);
        var result = await _sut.Handle(new GetOrdersQuery(filter, OrderSortBy.Oldest, new PageRequest(1, 20)), CancellationToken.None);

        result.TotalCount.Should().Be(0);
        await _orderRepository.Received(1).GetPagedAsync(filter, OrderSortBy.Oldest, 0, 20, Arg.Any<CancellationToken>());
    }
}

public sealed class GetMyOrdersQueryHandlerTests
{
    private readonly IOrderRepository _orderRepository = Substitute.For<IOrderRepository>();
    private readonly ICurrentUserService _currentUserService = Substitute.For<ICurrentUserService>();
    private readonly GetMyOrdersQueryHandler _sut;

    public GetMyOrdersQueryHandlerTests()
    {
        _sut = new GetMyOrdersQueryHandler(_orderRepository, _currentUserService);
    }

    [Fact]
    public async Task Handle_FiltersByTheCallersOwnCustomerIdNeverAnotherCustomer()
    {
        var customerId = Guid.NewGuid();
        _currentUserService.UserId.Returns(customerId);
        _orderRepository
            .GetPagedAsync(Arg.Is<OrderFilter>(f => f != null && f.CustomerId == customerId), OrderSortBy.Newest, 0, 20, Arg.Any<CancellationToken>())
            .Returns(((IReadOnlyList<Order>)[], 0));

        await _sut.Handle(new GetMyOrdersQuery(new PageRequest(1, 20)), CancellationToken.None);

        await _orderRepository.Received(1).GetPagedAsync(Arg.Is<OrderFilter>(f => f != null && f.CustomerId == customerId), OrderSortBy.Newest, 0, 20, Arg.Any<CancellationToken>());
    }
}
