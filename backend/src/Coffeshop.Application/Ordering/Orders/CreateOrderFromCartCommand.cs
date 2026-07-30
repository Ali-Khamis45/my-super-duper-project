using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Ordering.Dtos;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Application.Ordering.Mapping;
using Coffeshop.Domain.Catalog;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Ordering;
using Coffeshop.Domain.Ordering.Exceptions;
using Coffeshop.Domain.Ordering.ValueObjects;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Ordering.Orders;

public sealed record CartLineInput(Guid ProductId, RecipeSelectionDto Selection, int Quantity, string? RecommendationId);

/// <summary>
/// Phase 5's real centerpiece — "Connect frontend Cart with backend," "Never trust client
/// pricing. Backend recalculates totals." Deliberately has no <c>CustomerId</c> parameter: it is
/// read from <see cref="ICurrentUserService.UserId"/> inside the handler, never from the request
/// body — a client-supplied <c>customerId</c> field would be a real authorization hole (anyone
/// could place an order "as" any other user's account by just sending their Guid). Creates,
/// prices, and submits the order in one atomic command, matching this project's one real
/// checkout flow (`CheckoutExperience.tsx`'s single "Place Order" action) — see
/// <c>Coffeshop.Domain.Ordering.Order</c>'s own doc comment for why a separate "create a draft,
/// submit it later" round trip isn't built for a flow that doesn't exist.
/// </summary>
public sealed record CreateOrderFromCartCommand(
    IReadOnlyCollection<CartLineInput> Lines,
    string? GuestName,
    string? GuestEmail,
    string FulfillmentMethod,
    /// <summary>
    /// Additive (Phase 10) — a client-generated key, stable for one real "Place Order" attempt
    /// (`CheckoutExperience.tsx` generates it once per page instance, not per click). A real,
    /// live-verified bug this sprint's own adversarial review caught: two concurrent identical
    /// checkout requests with no idempotency protection created two separate real orders. See
    /// <c>Coffeshop.Domain.Ordering.Order.IdempotencyKey</c>'s own doc comment.
    /// </summary>
    string IdempotencyKey) : ICommand<OrderDto>;

public sealed class CreateOrderFromCartCommandValidator : AbstractValidator<CreateOrderFromCartCommand>
{
    public CreateOrderFromCartCommandValidator()
    {
        RuleFor(x => x.Lines).NotEmpty().WithMessage("An order needs at least one item.");
        RuleForEach(x => x.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.ProductId).NotEmpty();
            line.RuleFor(l => l.Quantity).InclusiveBetween(1, 10);
        });
        RuleFor(x => x.FulfillmentMethod).Must(m => Enum.TryParse<Domain.Ordering.FulfillmentMethod>(m, true, out _))
            .WithMessage("Fulfillment method must be one of: Pickup.");
        RuleFor(x => x.IdempotencyKey).NotEmpty();
    }
}

internal sealed class CreateOrderFromCartCommandHandler(
    IOrderRepository orderRepository,
    IProductRepository productRepository,
    ICategoryRepository categoryRepository,
    IIngredientRepository ingredientRepository,
    ICurrentUserService currentUserService,
    IClock clock)
    : IRequestHandler<CreateOrderFromCartCommand, OrderDto>
{
    public async Task<OrderDto> Handle(CreateOrderFromCartCommand request, CancellationToken ct)
    {
        // Checked first, before consuming a sequence value or doing any pricing/catalog work —
        // a retried/double-fired request for the same real checkout attempt returns the order
        // that attempt already created, rather than creating a second one or wasting a sequence
        // value on a request that was never going to become a new order. Closes the realistic
        // threat model (a double-click, or a retry seconds apart) completely. A known, narrow,
        // honestly-documented residual gap: two requests landing within the same in-flight
        // SaveChanges window (true microsecond-scale simultaneity, not a human double-click) can
        // both pass this check before either commits — the second's insert then hits the unique
        // index on `idempotency_key` and 500s rather than transparently returning the first
        // order. Closing that too would need a retry-on-conflict wrapper around the whole
        // save (UnitOfWorkBehavior runs after this handler returns, so this handler alone can't
        // catch and recover from that specific save-time failure) — out of scope for this pass;
        // see docs/reviews/sprint-5.3-review.md.
        var existingOrder = await orderRepository.GetByIdempotencyKeyAsync(request.IdempotencyKey, ct);
        if (existingOrder is not null)
        {
            return existingOrder.ToDto();
        }

        var now = clock.UtcNow;
        var customerId = currentUserService.UserId;

        GuestOrderInfo? guestInfo = null;
        if (customerId is null)
        {
            if (string.IsNullOrWhiteSpace(request.GuestName) || string.IsNullOrWhiteSpace(request.GuestEmail))
            {
                throw new InvalidGuestOrderInfoException("Guest checkout requires a real name and email.");
            }

            guestInfo = GuestOrderInfo.Create(request.GuestName, request.GuestEmail);
        }

        var fulfillmentMethod = Enum.Parse<Domain.Ordering.FulfillmentMethod>(request.FulfillmentMethod, true);

        var sequenceValue = await orderRepository.NextOrderNumberAsync(ct);
        var order = Order.Create(OrderNumber.FromSequenceValue(sequenceValue), customerId, guestInfo, fulfillmentMethod, now, request.IdempotencyKey);

        // Loaded once, outside the loop — every ingredient a cart could reference is a handful
        // of rows, the same "one extra query, not one per line" discipline
        // `GetProductsQuery`/`GetMenuQuery` already apply to categories (Sprint 5.2, Phase 10).
        var ingredientsByCode = (await ingredientRepository.GetAllAsync(ct)).ToDictionary(i => i.Code);
        var categoryCodesById = new Dictionary<Guid, string>();

        foreach (var line in request.Lines)
        {
            var product = await productRepository.GetByIdAsync(line.ProductId, ct) ?? throw new ProductNotFoundException();

            if (product.Status != ProductStatus.Published || !product.IsAvailable)
            {
                throw new ProductNotAvailableException();
            }

            if (!categoryCodesById.TryGetValue(product.CategoryId, out var categoryCode))
            {
                var category = await categoryRepository.GetByIdAsync(product.CategoryId, ct) ?? throw new CategoryNotFoundException();
                categoryCode = category.Code;
                categoryCodesById[product.CategoryId] = categoryCode;
            }

            var placements = new List<RecipeIngredientPlacement>();
            var ingredientsTotal = Domain.Catalog.ValueObjects.Money.Zero();

            foreach (var placement in line.Selection.Ingredients)
            {
                if (!ingredientsByCode.TryGetValue(placement.IngredientId, out var ingredient))
                {
                    throw new IngredientNotFoundException();
                }

                if (!ingredient.IsCompatibleWith(categoryCode))
                {
                    throw new InvalidIngredientCompatibilityException($"'{ingredient.Name}' isn't offered with this drink.");
                }

                // Mirrors `calculateIngredientsTotal.ts`'s exact formula (sum of priceModifier *
                // quantity per placement) — the frontend's own displayed price and this
                // server-recalculated one use the identical rule, so they only ever differ if
                // the underlying catalog data itself changed, never from a formula mismatch.
                ingredientsTotal += ingredient.PriceModifier * placement.Quantity;
                placements.Add(new RecipeIngredientPlacement(placement.IngredientId, placement.Quantity));
            }

            var selection = RecipeSelection.Create(line.Selection.Color, line.Selection.Size, line.Selection.Sleeve, line.Selection.Lid, line.Selection.Logo, line.Selection.Material, placements);
            var unitPrice = product.Price.Amount + ingredientsTotal;

            order.AddItem(product.Id, product.Name, product.Sku.Value, selection, unitPrice, line.Quantity, line.RecommendationId);
        }

        order.Submit(now);
        orderRepository.Add(order);

        // order.CreatedAtUtc is still default(DateTimeOffset) here: AuditableEntityInterceptor
        // only stamps it during SaveChangesAsync, which UnitOfWorkBehavior runs *after* this
        // handler returns (a real bug caught during Phase 4 live verification — the response
        // showed "0001-01-01"). `now` is the exact same timestamp already used for
        // Order.Create/order.Submit above, so it's consistent with the timeline entries in this
        // same response, not just a stand-in.
        return order.ToDto() with { CreatedAtUtc = now };
    }
}
