namespace Coffeshop.Api.Endpoints.Inventory;

public sealed record CreateInventoryItemRequest(Guid IngredientId, int InitialStock, int? LowStockThreshold);

public sealed record RestockInventoryRequest(int Quantity, string? Note);

public sealed record AdjustInventoryRequest(int Delta, string Reason);

public sealed record UpdateLowStockPolicyRequest(int Threshold);
