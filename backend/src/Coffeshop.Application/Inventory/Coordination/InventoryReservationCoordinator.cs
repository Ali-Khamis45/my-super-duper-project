using Coffeshop.Application.Inventory.Interfaces;
using Coffeshop.Domain.Inventory;
using Coffeshop.Domain.Inventory.Exceptions;

namespace Coffeshop.Application.Inventory.Coordination;

internal sealed class InventoryReservationCoordinator(
    IInventoryItemRepository inventoryItemRepository,
    IInventoryReservationRepository inventoryReservationRepository,
    IInventoryTransactionRepository inventoryTransactionRepository) : IInventoryReservationCoordinator
{
    public async Task ReserveForOrderAsync(Guid orderId, IReadOnlyDictionary<Guid, int> ingredientQuantities, DateTimeOffset nowUtc, DateTimeOffset expiresAtUtc, CancellationToken ct)
    {
        if (ingredientQuantities.Count == 0)
        {
            return;
        }

        // Pass 1: resolve every requested ingredient's InventoryItem, reclaim its own expired
        // holds, and validate availability — no InventoryItem/InventoryReservation mutation that
        // actually *reserves* anything happens yet. See this class's own interface doc comment
        // for why the check pass and the mutate pass must stay fully separate.
        var toReserve = new List<(InventoryItem Item, int Quantity)>();

        foreach (var (ingredientId, quantity) in ingredientQuantities)
        {
            var item = await inventoryItemRepository.GetByIngredientIdAsync(ingredientId, ct);
            if (item is null)
            {
                continue; // Not opted into stock tracking — see InventoryItem's own scope decision.
            }

            var expiredHolds = await inventoryReservationRepository.GetExpiredActiveByInventoryItemIdAsync(item.Id, nowUtc, ct);
            foreach (var expiredHold in expiredHolds)
            {
                item.Release(expiredHold.Quantity, nowUtc);
                expiredHold.Expire(nowUtc);
            }

            if (item.AvailableQuantity < quantity)
            {
                throw new InsufficientStockException($"Only {item.AvailableQuantity} unit(s) of ingredient '{ingredientId}' available, {quantity} requested.");
            }

            toReserve.Add((item, quantity));
        }

        // Pass 2: every item above already passed its check — this loop only raises
        // InsufficientStockException in a genuine same-request double-booking of the same
        // ingredient, which can't happen since ingredientQuantities is keyed one entry per
        // ingredient.
        foreach (var (item, quantity) in toReserve)
        {
            var reservation = item.Reserve(orderId, quantity, nowUtc, expiresAtUtc);
            inventoryReservationRepository.Add(reservation);
        }
    }

    public async Task ReleaseForOrderAsync(Guid orderId, DateTimeOffset nowUtc, CancellationToken ct)
    {
        var reservations = await inventoryReservationRepository.GetActiveByOrderIdAsync(orderId, ct);
        foreach (var reservation in reservations)
        {
            var item = await inventoryItemRepository.GetByIdAsync(reservation.InventoryItemId, ct) ?? throw new InventoryItemNotFoundException();
            item.Release(reservation.Quantity, nowUtc);
            reservation.Release(nowUtc);
        }
    }

    public async Task ConsumeForOrderAsync(Guid orderId, DateTimeOffset nowUtc, CancellationToken ct)
    {
        var reservations = await inventoryReservationRepository.GetActiveByOrderIdAsync(orderId, ct);
        foreach (var reservation in reservations)
        {
            var item = await inventoryItemRepository.GetByIdAsync(reservation.InventoryItemId, ct) ?? throw new InventoryItemNotFoundException();
            var transaction = item.Consume(orderId, reservation.Quantity, nowUtc);
            inventoryTransactionRepository.Add(transaction);
            reservation.Consume(nowUtc);
        }
    }
}
