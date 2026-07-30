import { API_BASE_URL, parseProblemDetails } from "./api-errors";
import { authorizedFetch } from "./auth-client";
import type { IngredientCategoryDto, IngredientDto } from "./catalog-types";

function jsonHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await parseProblemDetails(response);
  return response.json();
}

/** GET /api/v1/ingredients — the 9 real ingredients, one per named type. Anonymous. */
export async function getIngredients(): Promise<IngredientDto[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ingredients`);
  return readJson(response);
}

/** GET /api/v1/ingredient-categories — real Guids for the "create ingredient" category picker. Anonymous. */
export async function getIngredientCategories(): Promise<IngredientCategoryDto[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/ingredient-categories`);
  return readJson(response);
}

export interface CreateIngredientInput {
  code: string;
  name: string;
  ingredientCategoryId: string;
  priceModifier: number;
  compatibleCategoryCodes: string[];
  isUniversallyCompatible: boolean;
  color: string;
  shape: "ring" | "sprinkles" | "ice";
  sortOrder: number;
}

/** POST /api/v1/ingredients — admin-only (`ManageProducts`). */
export async function createIngredient(input: CreateIngredientInput): Promise<IngredientDto> {
  const response = await authorizedFetch("/api/v1/ingredients", {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(input),
  });
  return readJson(response);
}

export interface UpdateIngredientInput {
  name: string;
  priceModifier: number;
  color: string;
  sortOrder: number;
  compatibleCategoryCodes: string[];
  isUniversallyCompatible: boolean;
}

/** PUT /api/v1/ingredients/{code} — admin-only (`ManageProducts`); code is immutable, matching `updateCategory`'s own reasoning. */
export async function updateIngredient(code: string, input: UpdateIngredientInput): Promise<IngredientDto> {
  const response = await authorizedFetch(`/api/v1/ingredients/${code}`, {
    method: "PUT",
    headers: jsonHeaders(),
    body: JSON.stringify(input),
  });
  return readJson(response);
}
