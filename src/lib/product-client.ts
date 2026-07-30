import { parseProblemDetails } from "./api-errors";
import { authorizedFetch } from "./auth-client";
import type { PagedResultDto, ProductDto, ProductImageDto, ProductSummaryDto } from "./catalog-types";

/**
 * Admin-only Catalog mutations — every call here requires the `ManageProducts` permission
 * (enforced server-side; `authorizedFetch` attaches the bearer token and transparently retries
 * once after a refresh on 401, exactly as `auth-client.ts`'s own protected calls do). Reads
 * (`getMenu`/`getCategories`/`getIngredients`/`searchProducts`) are anonymous and live in their
 * own client files — this file is the write side, plus the admin-facing paginated listing and
 * single-product fetch no public page needs.
 */

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseProblemDetails(response);
  return response.json();
}

export interface AdminProductFilter {
  category?: string;
  season?: string;
  temperature?: string;
  isAvailable?: boolean;
  status?: "draft" | "published" | "archived";
  /** Plain `ILIKE` against `Name` only — see `ProductRepository.ApplyFilter`'s own comment for why `Sku` isn't included. */
  search?: string;
  sortBy?: "Name" | "PriceAscending" | "PriceDescending" | "Newest";
  page?: number;
  pageSize?: number;
}

export async function getProducts(filter: AdminProductFilter = {}): Promise<PagedResultDto<ProductSummaryDto>> {
  const params = new URLSearchParams();
  if (filter.category) params.set("category", filter.category);
  if (filter.season) params.set("season", filter.season);
  if (filter.temperature) params.set("temperature", filter.temperature);
  if (filter.isAvailable !== undefined) params.set("isAvailable", String(filter.isAvailable));
  if (filter.status) params.set("status", filter.status);
  if (filter.search) params.set("search", filter.search);
  if (filter.sortBy) params.set("sortBy", filter.sortBy);
  params.set("page", String(filter.page ?? 1));
  params.set("pageSize", String(filter.pageSize ?? 20));

  const response = await authorizedFetch(`/api/v1/products?${params}`);
  return readJson(response);
}

export async function getProduct(id: string): Promise<ProductDto> {
  const response = await authorizedFetch(`/api/v1/products/${id}`);
  return readJson(response);
}

export interface CreateProductInput {
  sku: string;
  name: string;
  categoryCode: string;
  price: number;
  compareAtPrice?: number | null;
  tagline: string;
  description: string;
  tags: string[];
  season: string;
  temperature: string;
  type: string;
}

export async function createProduct(input: CreateProductInput): Promise<ProductDto> {
  const response = await authorizedFetch("/api/v1/products", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ ...input, compareAtPrice: input.compareAtPrice ?? null }),
  });
  return readJson(response);
}

export interface UpdateProductInput {
  name: string;
  tagline: string;
  description: string;
  tags: string[];
}

export async function updateProduct(id: string, input: UpdateProductInput): Promise<ProductDto> {
  const response = await authorizedFetch(`/api/v1/products/${id}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(input),
  });
  return readJson(response);
}

export async function updatePricing(id: string, price: number, compareAtPrice: number | null): Promise<ProductDto> {
  const response = await authorizedFetch(`/api/v1/products/${id}/pricing`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ price, compareAtPrice }),
  });
  return readJson(response);
}

export async function assignCategory(id: string, categoryCode: string): Promise<ProductDto> {
  const response = await authorizedFetch(`/api/v1/products/${id}/category`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ categoryCode }),
  });
  return readJson(response);
}

export async function updateAvailability(id: string, isAvailable: boolean): Promise<void> {
  const response = await authorizedFetch(`/api/v1/products/${id}/availability`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ isAvailable }),
  });
  if (!response.ok) throw await parseProblemDetails(response);
}

// `PUT /api/v1/products/{id}/featured` (SetFeaturedCommand) has no client function here yet — no
// admin UI section calls it, and no customer-facing featured section exists to make a toggle
// meaningful (see `menu-client.ts`'s own note on `getFeatured` for the matching read-side gap).
// Add it back the same milestone a real one gets built, not before.

async function postAction(id: string, action: string): Promise<void> {
  const response = await authorizedFetch(`/api/v1/products/${id}/${action}`, { method: "POST" });
  if (!response.ok) throw await parseProblemDetails(response);
}

export const publishProduct = (id: string) => postAction(id, "publish");
export const archiveProduct = (id: string) => postAction(id, "archive");
export const restoreProduct = (id: string) => postAction(id, "restore");

export async function deleteProduct(id: string): Promise<void> {
  const response = await authorizedFetch(`/api/v1/products/${id}`, { method: "DELETE" });
  if (!response.ok) throw await parseProblemDetails(response);
}

export async function addImage(id: string, url: string, altText: string | null, isPrimary: boolean): Promise<ProductImageDto> {
  const response = await authorizedFetch(`/api/v1/products/${id}/images`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ url, altText, isPrimary }),
  });
  return readJson(response);
}

export async function removeImage(id: string, imageId: string): Promise<void> {
  const response = await authorizedFetch(`/api/v1/products/${id}/images/${imageId}`, { method: "DELETE" });
  if (!response.ok) throw await parseProblemDetails(response);
}
