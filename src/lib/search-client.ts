import { API_BASE_URL, parseProblemDetails } from "./api-errors";
import type { PagedResultDto, ProductSummaryDto } from "./catalog-types";

/** GET /api/v1/search — real PostgreSQL full-text search, ranked (name > tagline > description), prefix-matching. Empty/whitespace `query` returns an empty page without a network call — matches the backend's own "empty tsquery → zero results" behavior without paying for the round trip. */
export async function searchProducts(query: string, page = 1, pageSize = 20): Promise<PagedResultDto<ProductSummaryDto>> {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { items: [], page, pageSize, totalCount: 0, totalPages: 0 };
  }

  const params = new URLSearchParams({ q: trimmed, page: String(page), pageSize: String(pageSize) });
  const response = await fetch(`${API_BASE_URL}/api/v1/search?${params}`);
  if (!response.ok) throw await parseProblemDetails(response);
  return response.json();
}

/** GET /api/v1/search/autocomplete — name-prefix suggestions via the trigram index, a tighter latency budget than the ranked search above. The result count is fixed server-side (`AutocompleteQueryHandler` hardcodes 10) — no `take` param exists to bind on the backend, so none is sent here. */
export async function autocomplete(prefix: string): Promise<string[]> {
  const trimmed = prefix.trim();
  if (trimmed.length === 0) return [];

  const params = new URLSearchParams({ q: trimmed });
  const response = await fetch(`${API_BASE_URL}/api/v1/search/autocomplete?${params}`);
  if (!response.ok) throw await parseProblemDetails(response);
  return response.json();
}
