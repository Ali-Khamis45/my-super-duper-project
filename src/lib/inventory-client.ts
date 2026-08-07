import { parseProblemDetails } from "./api-errors";
import { authorizedFetch } from "./auth-client";
import type { PagedResultDto } from "./catalog-types";

/**
 * Sprint 5.4 — `/api/v1/admin/inventory/*`, mirroring `order-client.ts`'s own shape exactly.
 * Every route is admin/staff-only (`PermissionCodes.ViewInventory`/`AdjustInventory`, enforced
 * server-side) — there is no customer-facing "my inventory" concept, so unlike `order-client.ts`
 * this module has no anonymous-callable functions at all.
 */

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseProblemDetails(response);
  return response.json();
}

/** `"available" | "low-stock" | "out-of-stock"` — kebab-case on the wire, see `InventoryMappingExtensions.ToApiString(InventoryStatus)`'s own doc comment for why (unlike `OrderStatus`, `InventoryStatus` has multi-word members). */
export type InventoryStatusValue = "available" | "low-stock" | "out-of-stock";

/** `"active" | "consumed" | "released" | "expired"` — plain lowercase; every `InventoryReservationStatus` member is a single word. */
export type InventoryReservationStatusValue = "active" | "consumed" | "released" | "expired";

/** `"order-consumption" | "restock" | "manual-adjustment"` — kebab-case, same reasoning as `InventoryStatusValue`. */
export type InventoryReasonValue = "order-consumption" | "restock" | "manual-adjustment";

export interface InventoryItemDto {
  id: string;
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  stockLevel: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  status: InventoryStatusValue;
  createdAtUtc: string;
  modifiedAtUtc: string | null;
}

export interface InventoryItemSummaryDto {
  id: string;
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  stockLevel: number;
  availableQuantity: number;
  lowStockThreshold: number;
  status: InventoryStatusValue;
}

export interface InventoryReservationDto {
  id: string;
  inventoryItemId: string;
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  orderId: string;
  /** The real, human-readable order number ("CS-000042") — resolved server-side, additive Sprint 5.4. */
  orderNumber: string | null;
  quantity: number;
  status: InventoryReservationStatusValue;
  expiresAtUtc: string;
  closedAtUtc: string | null;
  createdAtUtc: string;
}

export interface InventoryTransactionDto {
  id: string;
  inventoryItemId: string;
  ingredientId: string;
  ingredientCode: string;
  ingredientName: string;
  reason: InventoryReasonValue;
  quantityDelta: number;
  balanceAfter: number;
  orderId: string | null;
  note: string | null;
  occurredAtUtc: string;
}

export interface InventoryDashboardDto {
  totalItems: number;
  availableCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  activeReservationsCount: number;
  lowStockItems: InventoryItemSummaryDto[];
  outOfStockItems: InventoryItemSummaryDto[];
}

export interface AdminInventoryFilter {
  status?: InventoryStatusValue;
  search?: string;
  sortBy?: "NameAsc" | "StockAscending" | "StockDescending";
  page?: number;
  pageSize?: number;
}

export async function getInventory(filter: AdminInventoryFilter = {}): Promise<PagedResultDto<InventoryItemSummaryDto>> {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.search) params.set("search", filter.search);
  if (filter.sortBy) params.set("sortBy", filter.sortBy);
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 20));

  const response = await authorizedFetch(`/api/v1/admin/inventory?${params}`);
  return readJson(response);
}

export async function getInventoryItem(id: string): Promise<InventoryItemDto> {
  const response = await authorizedFetch(`/api/v1/admin/inventory/${id}`);
  return readJson(response);
}

export async function getInventoryDashboard(): Promise<InventoryDashboardDto> {
  const response = await authorizedFetch("/api/v1/admin/inventory/dashboard");
  return readJson(response);
}

export interface InventoryHistoryFilter {
  inventoryItemId?: string;
  ingredientId?: string;
  orderId?: string;
  reason?: InventoryReasonValue;
  page?: number;
  pageSize?: number;
}

export async function getInventoryHistory(filter: InventoryHistoryFilter = {}): Promise<PagedResultDto<InventoryTransactionDto>> {
  const params = new URLSearchParams();
  if (filter.inventoryItemId) params.set("inventoryItemId", filter.inventoryItemId);
  if (filter.ingredientId) params.set("ingredientId", filter.ingredientId);
  if (filter.orderId) params.set("orderId", filter.orderId);
  if (filter.reason) params.set("reason", filter.reason);
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 20));

  const response = await authorizedFetch(`/api/v1/admin/inventory/history?${params}`);
  return readJson(response);
}

export interface InventoryReservationsFilter {
  status?: InventoryReservationStatusValue;
  orderId?: string;
  ingredientId?: string;
  page?: number;
  pageSize?: number;
}

export async function getInventoryReservations(filter: InventoryReservationsFilter = {}): Promise<PagedResultDto<InventoryReservationDto>> {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.orderId) params.set("orderId", filter.orderId);
  if (filter.ingredientId) params.set("ingredientId", filter.ingredientId);
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 20));

  const response = await authorizedFetch(`/api/v1/admin/inventory/reservations?${params}`);
  return readJson(response);
}

export async function restockInventoryItem(id: string, quantity: number, note: string | null): Promise<InventoryItemDto> {
  const response = await authorizedFetch(`/api/v1/admin/inventory/${id}/restock`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ quantity, note }),
  });
  return readJson(response);
}

export async function adjustInventoryItem(id: string, delta: number, reason: string): Promise<InventoryItemDto> {
  const response = await authorizedFetch(`/api/v1/admin/inventory/${id}/adjust`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ delta, reason }),
  });
  return readJson(response);
}

export async function markInventoryItemOutOfStock(id: string): Promise<InventoryItemDto> {
  const response = await authorizedFetch(`/api/v1/admin/inventory/${id}/mark-out-of-stock`, { method: "POST" });
  return readJson(response);
}

export async function markInventoryItemAvailable(id: string): Promise<InventoryItemDto> {
  const response = await authorizedFetch(`/api/v1/admin/inventory/${id}/mark-available`, { method: "POST" });
  return readJson(response);
}

export async function updateLowStockPolicy(id: string, threshold: number): Promise<InventoryItemDto> {
  const response = await authorizedFetch(`/api/v1/admin/inventory/${id}/low-stock-policy`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ threshold }),
  });
  return readJson(response);
}

export async function expireReservation(id: string): Promise<InventoryReservationDto> {
  const response = await authorizedFetch(`/api/v1/admin/inventory/reservations/${id}/expire`, { method: "POST" });
  return readJson(response);
}
