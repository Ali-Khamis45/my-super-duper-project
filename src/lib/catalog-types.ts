/**
 * TypeScript mirrors of `Coffeshop.Application.Catalog.Dtos` — hand-written, matching this
 * project's established "no reflection-based mapper" discipline (`CatalogMappingExtensions.cs`)
 * on the backend side. Field names/casing match the real JSON responses exactly (camelCase, per
 * ASP.NET Core's default minimal-API `JsonOptions`), not guessed.
 */

export interface ProductVariantDto {
  id: string;
  name: string;
  priceAdjustment: number;
  sortOrder: number;
}

export interface ProductImageDto {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface NutritionFactsDto {
  calories: number | null;
  caffeineMg: number | null;
  sugarGrams: number | null;
}

export interface ProductDto {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  tagline: string;
  description: string;
  tags: string[];
  status: "draft" | "published" | "archived";
  isAvailable: boolean;
  season: "allyear" | "fall" | "winter" | "spring" | "summer";
  temperature: "hot" | "iced" | "both";
  type: "beverage";
  nutrition: NutritionFactsDto | null;
  variants: ProductVariantDto[];
  images: ProductImageDto[];
}

/** The `/menu` and `/search` shape — see `ProductSummaryDto.cs`'s own doc comment for why `description` is included despite the otherwise-lean field set. */
export interface ProductSummaryDto {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  compareAtPrice: number | null;
  tagline: string;
  description: string;
  tags: string[];
  status: "draft" | "published" | "archived";
  isAvailable: boolean;
  season: string;
  temperature: string;
}

export interface CategoryDto {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
}

/** GET /api/v1/ingredient-categories — the real Guids `CreateIngredientCommand.IngredientCategoryId` requires; separate from `CategoryDto` (product categories) and from `IngredientDto.category` (a stable string code, no Guid). */
export interface IngredientCategoryDto {
  id: string;
  code: string;
  name: string;
}

export interface IngredientDto {
  id: string;
  name: string;
  category: string;
  priceModifier: number;
  compatibleWith: "all" | string[];
  color: string;
  shape: "ring" | "sprinkles" | "ice";
  sortOrder: number;
}

/** Matches `PagedResult&lt;T&gt;`'s real serialized shape exactly — every list endpoint in this API, `/search` and `/products` (admin) included, never a bare array. */
export interface PagedResultDto<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
