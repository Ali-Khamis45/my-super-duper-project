import { parseProblemDetails } from "./api-errors";
import { authorizedFetch } from "./auth-client";
import type { PagedResultDto } from "./catalog-types";

/**
 * Sprint 5.3 — the real `POST /api/v1/orders` and friends, replacing `cart-store.ts`'s local,
 * fake `placeOrder()`. `authorizedFetch` (not a raw `fetch`) everywhere, including the
 * `AllowAnonymous` create endpoint: it only attaches a bearer token when one actually exists
 * (`auth-client.ts`'s own behavior), so a signed-in customer's order still gets a real
 * `customerId` server-side, and a guest's still goes through with none — the exact same dual
 * path the backend's `CreateOrderFromCartCommandHandler` already supports.
 */

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseProblemDetails(response);
  return response.json();
}

export interface RecipeIngredientPlacementDto {
  ingredientId: string;
  quantity: number;
}

export interface RecipeSelectionDto {
  color: string;
  size: string;
  sleeve: string;
  lid: string;
  logo: string;
  material: string;
  ingredients: RecipeIngredientPlacementDto[];
}

export interface OrderItemDto {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  selection: RecipeSelectionDto;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  recommendationId: string | null;
}

export interface OrderTimelineEntryDto {
  status: string;
  occurredAtUtc: string;
  note: string | null;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  status: string;
  customerId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  fulfillmentMethod: string;
  items: OrderItemDto[];
  subtotal: number;
  total: number;
  timeline: OrderTimelineEntryDto[];
  cancellationReason: string | null;
  failureReason: string | null;
  createdAtUtc: string;
}

export interface OrderSummaryDto {
  id: string;
  orderNumber: string;
  status: string;
  customerId: string | null;
  guestName: string | null;
  itemCount: number;
  total: number;
  createdAtUtc: string;
}

export interface CreateOrderLineInput {
  productId: string;
  selection: RecipeSelectionDto;
  quantity: number;
  recommendationId: string | null;
}

export interface CreateOrderInput {
  lines: CreateOrderLineInput[];
  guestName: string | null;
  guestEmail: string | null;
  fulfillmentMethod: "Pickup";
  /** Phase 10 — stable per real checkout attempt (`CheckoutExperience.tsx` generates it once per page mount, not per click); see the backend's `Order.IdempotencyKey` for why. */
  idempotencyKey: string;
}

export async function createOrder(input: CreateOrderInput): Promise<OrderDto> {
  const response = await authorizedFetch("/api/v1/orders", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(input),
  });
  return readJson(response);
}

export async function getOrder(id: string): Promise<OrderDto> {
  const response = await authorizedFetch(`/api/v1/orders/${id}`);
  return readJson(response);
}

export async function getMyOrders(page = 1, pageSize = 20): Promise<PagedResultDto<OrderSummaryDto>> {
  const response = await authorizedFetch(`/api/v1/orders/me?page=${page}&pageSize=${pageSize}`);
  return readJson(response);
}

export async function cancelOrder(id: string, reason: string | null): Promise<OrderDto> {
  const response = await authorizedFetch(`/api/v1/orders/${id}/cancel`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ reason }),
  });
  return readJson(response);
}

// Admin/staff — `PermissionCodes.ViewOrders`/`UpdateOrderStatus`, enforced server-side.

export interface AdminOrderFilter {
  customerId?: string;
  status?: string;
  search?: string;
  sortBy?: "Newest" | "Oldest";
  page?: number;
  pageSize?: number;
}

export async function getOrders(filter: AdminOrderFilter = {}): Promise<PagedResultDto<OrderSummaryDto>> {
  const params = new URLSearchParams();
  if (filter.customerId) params.set("customerId", filter.customerId);
  if (filter.status) params.set("status", filter.status);
  if (filter.search) params.set("search", filter.search);
  if (filter.sortBy) params.set("sortBy", filter.sortBy);
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 20));

  const response = await authorizedFetch(`/api/v1/admin/orders?${params}`);
  return readJson(response);
}

export async function getAdminOrder(id: string): Promise<OrderDto> {
  const response = await authorizedFetch(`/api/v1/admin/orders/${id}`);
  return readJson(response);
}

export async function payOrder(id: string): Promise<OrderDto> {
  const response = await authorizedFetch(`/api/v1/orders/${id}/pay`, { method: "POST" });
  return readJson(response);
}

export async function completeOrder(id: string): Promise<OrderDto> {
  const response = await authorizedFetch(`/api/v1/orders/${id}/complete`, { method: "POST" });
  return readJson(response);
}

export async function failOrder(id: string, reason: string): Promise<OrderDto> {
  const response = await authorizedFetch(`/api/v1/orders/${id}/fail`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ reason }),
  });
  return readJson(response);
}
