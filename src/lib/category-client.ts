import { API_BASE_URL, parseProblemDetails } from "./api-errors";
import { authorizedFetch } from "./auth-client";
import type { CategoryDto } from "./catalog-types";

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseProblemDetails(response);
  return response.json();
}

/** GET /api/v1/categories — the 4 real categories, sorted by `sortOrder`. Anonymous. */
export async function getCategories(): Promise<CategoryDto[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/categories`);
  return readJson(response);
}

/** POST /api/v1/categories — admin-only (`ManageProducts`). */
export async function createCategory(code: string, name: string, sortOrder: number): Promise<CategoryDto> {
  const response = await authorizedFetch("/api/v1/categories", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ code, name, sortOrder }),
  });
  return readJson(response);
}

/** PUT /api/v1/categories/{id} — admin-only (`ManageProducts`). Code is immutable once created (no `UpdateCategoryCommand` field for it — see that command's own parameter list). */
export async function updateCategory(id: string, name: string, sortOrder: number): Promise<CategoryDto> {
  const response = await authorizedFetch(`/api/v1/categories/${id}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify({ name, sortOrder }),
  });
  return readJson(response);
}
