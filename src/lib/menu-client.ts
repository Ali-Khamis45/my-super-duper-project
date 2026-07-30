import { API_BASE_URL, parseProblemDetails } from "./api-errors";
import type { ProductSummaryDto } from "./catalog-types";

/**
 * GET /api/v1/menu — published, available products only, unpaginated, matching this app's own
 * real "load the whole catalog once" usage (see `GetMenuQuery.cs`'s doc comment).
 *
 * `/api/v1/featured` (`GetFeaturedQuery`) has no client function here yet — no frontend surface
 * shows a featured-drinks section today (the home page is hero-only), and this project's own
 * "no zero-consumer scaffolding" rule (`hero-cup/README.md`) applies as much to a client
 * function as to a component. Add it back — it's a five-line mirror of `getMenu` above — the
 * same milestone a real featured section gets built, not before.
 */
export async function getMenu(): Promise<ProductSummaryDto[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/menu`);
  if (!response.ok) throw await parseProblemDetails(response);
  return response.json();
}
