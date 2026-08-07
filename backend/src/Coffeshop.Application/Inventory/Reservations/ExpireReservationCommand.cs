using Coffeshop.Application.Catalog.Interfaces;
using Coffeshop.Application.Common.Interfaces;
using Coffeshop.Application.Common.Messaging;
using Coffeshop.Application.Inventory.Dtos;
using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Application.Inventory.Mapping;
using Coffeshop.Application.Ordering.Interfaces;
using Coffeshop.Domain.Catalog.Exceptions;
using Coffeshop.Domain.Inventory.Exceptions;
using FluentValidation;
using MediatR;

namespace Coffeshop.Application.Inventory.Reservations;

/// <summary>
/// The one reservation-lifecycle command from this sprint's Phase 2 brief that stays a real,
/// public MediatR command — see <c>IInventoryReservationCoordinator</c>'s own doc comment for
/// why <c>ReserveInventory</c>/<c>ReleaseInventory</c>/<c>ConsumeInventory</c>/<c>CreateReservation</c>
/// did not. Its real caller: staff manually force-expiring a stuck hold from the admin
/// Reservation Viewer (Phase 6) — e.g. a reservation whose order was abandoned mid-checkout in a
/// way that never reached <c>Cancel</c>/<c>Fail</c>, and staff don't want to wait for
/// <see cref="IInventoryReservationRepository.GetExpiredActiveByInventoryItemIdAsync"/>'s lazy
/// sweep to reclaim it the next time that ingredient is needed. Admin-only
/// (<c>PermissionCodes.AdjustInventory</c>, enforced at the endpoint).
/// </summary>
public sealed record ExpireReservationCommand(Guid ReservationId) : ICommand<InventoryReservationDto>;

public sealed class ExpireReservationCommandValidator : AbstractValidator<ExpireReservationCommand>
{
    public ExpireReservationCommandValidator() => RuleFor(x => x.ReservationId).NotEmpty();
}

internal sealed class ExpireReservationCommandHandler(
    IInventoryReservationRepository inventoryReservationRepository,
    IInventoryItemRepository inventoryItemRepository,
    IIngredientRepository ingredientRepository,
    IOrderRepository orderRepository,
    IClock clock) : IRequestHandler<ExpireReservationCommand, InventoryReservationDto>
{
    public async Task<InventoryReservationDto> Handle(ExpireReservationCommand request, CancellationToken ct)
    {
        var reservation = await inventoryReservationRepository.GetByIdAsync(request.ReservationId, ct) ?? throw new InventoryReservationNotFoundException();
        var item = await inventoryItemRepository.GetByIdAsync(reservation.InventoryItemId, ct) ?? throw new InventoryItemNotFoundException();
        var ingredient = await ingredientRepository.GetByIdAsync(reservation.IngredientId, ct) ?? throw new IngredientNotFoundException();

        var now = clock.UtcNow;
        item.Release(reservation.Quantity, now);
        reservation.Expire(now);

        var orderNumbers = await orderRepository.GetOrderNumbersByIdsAsync([reservation.OrderId], ct);
        return reservation.ToDto(ingredient, orderNumbers.GetValueOrDefault(reservation.OrderId));
    }
}
